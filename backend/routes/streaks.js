const express  = require('express');
const router   = express.Router();
const Checkin  = require('../models/Checkin');
const Squad    = require('../models/Squad');
const User     = require('../models/User');
const auth     = require('../middleware/auth');

router.post('/checkin', auth, async (req, res) => {
  try {
    const { squadId, note, mood, completed, amountLogged } = req.body;
    if (!squadId) return res.status(400).json({ error: 'squadId required' });
    const today = new Date().toISOString().slice(0,10);
    const existing = await Checkin.findOne({ user:req.user._id, squad:squadId, dateKey:today });
    // If editing today's check-in, update in place (don't re-count streak or total days)
    if (existing) {
      existing.note         = note || existing.note;
      existing.mood         = mood || existing.mood;
      existing.completed    = completed !== undefined ? completed : existing.completed;
      existing.amountLogged = amountLogged !== undefined ? amountLogged : existing.amountLogged;
      await existing.save();
      const populated = await existing.populate('user','username photoUrl');
      req.io.to(`squad_${squadId}`).emit('checkin_updated', { checkin: populated });
      return res.json({ checkin: populated, currentStreak: null, badges: [], updated: true });
    }
    const squad = await Squad.findById(squadId);
    if (!squad) return res.status(404).json({ error:'Squad not found' });
    const memberIdx = squad.members.findIndex(m=>m.user.toString()===req.user._id.toString());
    if (memberIdx===-1) return res.status(403).json({ error:'Not a member' });
    const isCountable = squad.goalType==='amount'
      ? (squad.goalTarget ? (amountLogged||0)>=squad.goalTarget : true)
      : (completed!==false);
    const member = squad.members[memberIdx];
    const now = new Date();
    let newStreak = member.currentStreak;
    if (isCountable) {
      if (member.lastCheckin) {
        const diff = (now-new Date(member.lastCheckin))/(1000*60*60);
        newStreak = diff<=48 ? member.currentStreak+1 : 1;
      } else { newStreak=1; }
    }
    squad.members[memberIdx].currentStreak = newStreak;
    squad.members[memberIdx].longestStreak = Math.max(member.longestStreak,newStreak);
    squad.members[memberIdx].totalCheckins += 1;
    squad.members[memberIdx].lastCheckin   = now;
    await squad.save();
    // totalStreakDays = unique active days (first countable check-in of the calendar day only)
    const alreadyToday = await Checkin.findOne({ user:req.user._id, dateKey:today });
    const isFirstToday = !alreadyToday;
    await User.findByIdAndUpdate(req.user._id,{
      ...(isCountable&&isFirstToday?{$inc:{totalStreakDays:1}}:{}),
      $max:{longestStreak:newStreak}
    });
    const checkin = await Checkin.create({
      user:req.user._id, squad:squadId,
      note:note||'', mood:mood||3,
      completed:completed!==false,
      amountLogged:squad.goalType==='amount'?(amountLogged||0):null,
      streakDay:newStreak, date:now
    });
    const populated = await checkin.populate('user','username photoUrl');
    const updatedUser = await User.findById(req.user._id);
    const badges=[];
    const has=id=>updatedUser.badges.some(b=>b.id===id);
    const td = updatedUser.totalStreakDays;
    // Streak milestones
    if(newStreak===7   &&!has('week1'))   badges.push({id:'week1',   name:'1 Week Strong',    icon:'fire'});
    if(newStreak===30  &&!has('month1'))  badges.push({id:'month1',  name:'Month Master',     icon:'diamond'});
    if(newStreak===100 &&!has('cent'))    badges.push({id:'cent',    name:'Centurion',        icon:'lightning'});
    if(newStreak===200 &&!has('dbl'))     badges.push({id:'dbl',     name:'Double Century',   icon:'double'});
    // Total active days milestones
    if(td>=50  &&!has('days50'))   badges.push({id:'days50',   name:'50 Day Veteran',   icon:'fire'});
    if(td>=100 &&!has('days100'))  badges.push({id:'days100',  name:'100 Day Legend',   icon:'diamond'});
    if(td>=200 &&!has('days200'))  badges.push({id:'days200',  name:'200 Day Warrior',  icon:'lightning'});
    if(td>=365 &&!has('year1'))    badges.push({id:'year1',    name:'1 Year Champion',  icon:'year1'});
    if(td>=730 &&!has('year2'))    badges.push({id:'year2',    name:'2 Year Elite',     icon:'year2'});
    if(td>=1095&&!has('year3'))    badges.push({id:'year3',    name:'3 Year Master',    icon:'year3'});
    if(td>=1460&&!has('year4'))    badges.push({id:'year4',    name:'4 Year Legend',    icon:'year4'});
    if(td>=1825&&!has('year5'))    badges.push({id:'year5',    name:'5 Year Icon',      icon:'year5'});
    if(badges.length) await User.findByIdAndUpdate(req.user._id,{$push:{badges:{$each:badges}}});
    req.io.to(`squad_${squadId}`).emit('new_checkin',{checkin:populated,memberStreak:newStreak,badges});
    res.status(201).json({checkin:populated,currentStreak:newStreak,badges});
  } catch(err){
    if(err.code===11000) return res.status(400).json({error:'Already checked in today'});
    res.status(500).json({error:err.message});
  }
});

router.get('/squad/:squadId', auth, async (req,res)=>{
  try{
    const {page=1,limit=20}=req.query;
    const checkins=await Checkin.find({squad:req.params.squadId})
      .populate('user','username photoUrl')
      .sort({date:-1}).skip((page-1)*limit).limit(parseInt(limit));
    res.json(checkins);
  }catch(err){res.status(500).json({error:err.message});}
});

// Full year heatmap — from first checkin date up to today, supports year param
router.get('/heatmap/:squadId/:userId', auth, async(req,res)=>{
  try{
    const {year} = req.query;
    let startDate, endDate;
    const todayStr = new Date().toISOString().slice(0,10);

    if(year){
      startDate = `${year}-01-01`;
      endDate   = year===new Date().getFullYear().toString() ? todayStr : `${year}-12-31`;
    } else {
      // Default: last 12 months
      const d = new Date(); d.setFullYear(d.getFullYear()-1);
      startDate = d.toISOString().slice(0,10);
      endDate   = todayStr;
    }

    const checkins = await Checkin.find({
      squad: req.params.squadId,
      user:  req.params.userId,
      dateKey: { $gte: startDate, $lte: endDate }
    }).select('dateKey mood streakDay completed amountLogged').sort({date:1});

    // Also get the first ever checkin to know the range
    const first = await Checkin.findOne({ squad:req.params.squadId, user:req.params.userId })
      .select('dateKey').sort({date:1});

    const heatmap={};
    checkins.forEach(c=>{
      heatmap[c.dateKey]={mood:c.mood,streakDay:c.streakDay,completed:c.completed,amountLogged:c.amountLogged};
    });
    res.json({ heatmap, firstDate: first?.dateKey||null, todayStr });
  }catch(err){res.status(500).json({error:err.message});}
});

router.post('/:checkinId/react', auth, async(req,res)=>{
  try{
    const {reaction}=req.body;
    const checkin=await Checkin.findById(req.params.checkinId);
    if(!checkin) return res.status(404).json({error:'Not found'});
    const idx=checkin.reactions.findIndex(r=>r.user.toString()===req.user._id.toString());
    if(idx>-1) checkin.reactions[idx].reaction=reaction;
    else checkin.reactions.push({user:req.user._id,reaction});
    await checkin.save();
    req.io.to(`squad_${checkin.squad}`).emit('reaction_added',{checkinId:checkin._id,userId:req.user._id,reaction});
    res.json(checkin);
  }catch(err){res.status(500).json({error:err.message});}
});

module.exports = router;
