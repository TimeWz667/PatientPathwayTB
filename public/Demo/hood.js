var data = require("./data/data.json");


var tos = {TimeoutPre: 60, TimeoutEva: 60, TimeoutTre: 30};
var endDay = 3651;

var identify_event = function(rec) {
  rec.TB_PROC = rec.TB_PROC.toFixed(0);
    if (rec.TB_DIAG | rec.TB_DRUG | rec.TB_PROC) {
        drug = Number(rec.TB_DRUG);
        types = [(drug % 1E3), ((drug % 1E6)/1E3 + drug/1E6)];
        types = types.map(function(x) {return Number(x.toFixed(0))});
        day = (drug)?rec.TB_DRUG_DAY: 0;
        main = (day==0)?"None": (types[0]>=types[1])?"1st":"2nd";
        long = (day>=14)?(types[0] + types[1]): 0;
        dose = (long>1)?"LongMulti": (long==1)?"LongSingle": (day>0)?"Short": "None";

        return {
                Type: 'TB',
                Diag: (rec.PTB_DIAG)? "Strong": (rec.TB_DIAG)? "Slight": "None",
                Drug: (drug)? {Count: types, Long: long, Days: day, Dosage: dose, Main: main}: "None",
                Proc: (rec.TB_PROC)? ( (rec.TB_PROC/1E6 > 0)? "Strong": "Slight"): "None"
               };
    }

    if (rec.RES_DIAG) {
        if (rec.RES_DRUG >= 28) {
            return {Type: 'CLD'};
        } else {
            return {Type: 'ARD'};
        }
    }
    if (rec.HIV_DIAG) return {Type: 'HIV'};
    if (rec.NTM_DIAG) return {Type: 'NTM'};
    if (rec.DM_DIAG & rec.DM_DRUG >= 28) return {Type: 'DM'};
    if (rec.HIV_DIAG) return {Type: 'HIV'};
    return undefined;
}

function Record(rec) {
    this.Time = rec.TIME;
    this.Out = (rec.OUT_DATE)? rec.OUT_DATE: endDay;
    this.Cost = rec.T_AMT;
    this.Paid = rec.PART_AMT;
    this.Src = rec.SRC;
    this.Level = rec.CLINIC;
    this.Event = identify_event(rec);
}


function PreEvaluation(tos) {
  this.Timeout = tos;
  this.Last = {State: "None", Time: 0, Last: 0, End: 10000};
  this.History = [this.Last];
}

PreEvaluation.prototype.update = function(evt, ti) {
  var end = this.Last.End;
  if (evt.Type=="ARD" || evt.Type=="CLD" || evt.Type=="NTM") {
    if (end < ti) {
      this.Last = {State: "None", Time: end, Last: end, End: ti};
      this.History.push(this.Last);
    } else {
      this.Last.End = ti;
    }
    if (this.Last.State != evt.Type) {
      this.Last = {State: evt.Type, Time: ti, Last: ti, End: ti+this.Timeout};
      this.History.push(this.Last);
    } else {
      this.Last.Last = ti;
      this.Last.End = ti+this.Timeout;
    }
    return true;
  } else {
    return false;
  }
};

PreEvaluation.prototype.close = function (state, ti) {
  var end = this.Last.End;
  if (end < ti) {
    this.Last = {State: "None", Time: end, Last: end, End: ti};
    this.History.push(this.Last);
  } else {
    this.Last.End = ti;
  }
  this.Last = {State: state, Time: ti, Last: ti, End: ti};
  this.History.push(this.Last);
};

PreEvaluation.prototype.at = function (ti) {
  var hist;
  for (var i = 0; i < this.History.length; i++) {
    hist = this.History[i];
    if (hist.Time <= ti & hist.End > ti) {
      return hist.State;
    }
  }
  return hist.State;
};


function Evaluation(tos) {
  this.Timeout = tos;
  this.Last = {State: "None", Time: 0, Last: 0, End: 10000};
  this.History = [this.Last];
}

Evaluation.prototype.update = function(evt, ti) {
  var end = this.Last.End;
  if (evt.Type=="TB") {
    if (end < ti) {
      this.Last = {State: "None", Time: end, Last: end, End: ti};
      this.History.push(this.Last);
    } else {
      this.Last.End = ti;
    }

    newstate = (evt.Proc=="Strong")? "Strong": (evt.Proc!="None" | evt.Diag!="None")? "Slight": "None";
    if (this.Last.State == "None" | (this.Last.State == "Slight" & newstate == "Strong")) {
      this.Last = {State: newstate, Time: ti, Last: ti, End: ti+this.Timeout};
      this.History.push(this.Last);
    } else {
      this.Last.Last = ti;
      this.Last.End = ti+this.Timeout;
    }
  }
};

Evaluation.prototype.close = function (state, ti) {
  var end = this.Last.End;
  if (end < ti) {
    this.Last = {State: "None", Time: end, Last: end, End: ti};
    this.History.push(this.Last);
  } else {
    this.Last.End = ti;
  }
  this.Last = {State: state, Time: ti, Last: ti, End: ti};
  this.History.push(this.Last);
};

Evaluation.prototype.at = function (ti) {
  var hist;
  for (var i = 0; i < this.History.length; i++) {
    hist = this.History[i];
    if (hist.Time <= ti & hist.End > ti) {
      return hist.State;
    }
  }
  return hist.State;
};


function Treatment(tos) {
  this.Timeout = tos;
  this.Last = {State: "None", Time: 0, Last: 0, End: 10000};
  this.History = [this.Last];
  this.DrugHistory = [];
  this.DrugLast = false;
}

Treatment.prototype.update = function(evt, ti) {
  var end = this.Last.End;
  if (evt.Type=="TB" & evt.Drug != "None") {
    if (end < ti) {
      this.Last = {State: "None", Time: end, Last: end, End: ti};
      this.History.push(this.Last);
      this.DrugLast = false;
    } else {
      this.Last.End = ti;
    }

    var drug = evt.Drug;
    if (this.Last.State == "None") {
      if (drug.Dosage == "LongMulti") {
        this.Last = {State: drug.Main, Time: ti, Last: ti, End: ti+drug.Days+this.Timeout};
      } else {
        this.Last = {State: "Emp", Time: ti, Last: ti, End: ti+drug.Days+this.Timeout};
      }
      this.History.push(this.Last);
    } else if (this.Last.State == "Emp" & drug.Dosage == "LongMulti") {
      this.Last = {State: drug.Main, Time: ti, Last: ti, End: ti+drug.Days+this.Timeout};
      this.History.push(this.Last);
    } else if (this.Last.State == "1st" & drug.Main == "2nd") {
      this.Last = {State: "2nd", Time: ti, Last: ti, End: ti+drug.Days+this.Timeout};
      this.History.push(this.Last);
    } else {
      this.Last.Last = ti;
      this.Last.End = ti+drug.Days+this.Timeout;
    }

    // update drug history
    if (this.DrugLast) {
      if (this.DrugLast.Level == drug.Main) {
        this.DrugLast.End = Math.max(ti, this.DrugLast.End) + drug.Days;
      } else {
        if (drug.Dosage != "Short") {
          this.DrugLast = {"Level": drug.Main, "Start": ti,"End": ti+drug.Days};
          this.DrugHistory.push(this.DrugLast);
        }
      }
    } else {
      this.DrugLast = {"Level": drug.Main, "Start": ti,"End": ti+drug.Days};
      this.DrugHistory.push(this.DrugLast);
    }
  }
};

Treatment.prototype.close = function (state, ti) {
  var end = this.Last.End;
  if (end < ti) {
    this.Last = {State: "None", Time: end, Last: end, End: ti};
    this.History.push(this.Last);
  } else {
    this.Last.End = ti;
  }
  this.Last = {State: state, Time: ti, Last: ti, End: ti};
  this.History.push(this.Last);
};

Treatment.prototype.at = function (ti) {
  var hist;
  for (var i = 0; i < this.History.length; i++) {
    hist = this.History[i];
    if (hist.Time <= ti & hist.End > ti) {
      return hist.State;
    }
  }
  return hist.State;
};


var align_episode = function(pre, eva, tre) {
    var ts = pre.History.map(function(rec) {return rec.Time;})
      .concat(eva.History.map(function(rec) {return rec.Time;}))
      .concat(tre.History.map(function(rec) {return rec.Time;}));
    ts = Array.from(new Set(ts)).sort(function(a, b) {return a-b;});
    return ts.map(function(t) {return {Time: t, Pre: pre.at(t), Eva: eva.at(t), Tre: tre.at(t)};});
};

var find_cutpoints = function(episode) {
    return episode.filter(function(e) {return e.Pre=="None" & e.Eva=="None" & e.Tre=="None";})
                  .map(function(e){ return e.Time;});
};

var cut_pathways = function(episode, ts) {
    var paths = [];
    var path = [];
    var i;
    
    for (i = 1; i < episode.length; i++) {
        path.push(episode[i]);
        if (ts.indexOf(episode[i].Time) > 0) {
            paths.push({Episode: path});
            path = [];
        }
    }
    paths.push({Episode: path});
    return paths;
};

var label_pathways = function(path) {
    var epi = path.Episode;
    var tb_e = epi.filter(function(e) {return e.Eva != "Dead" & e.Eva != "End" & (e.Eva != "None" | e.Tre != "None");})
    var tb_t = epi.filter(function(e) {return e.Tre == "1st" | e.Tre == "2nd"})
    if (tb_t.length > 0) {
        path.Type = 'TB';
    } else if (tb_e.length > 0) {
        path.Type = 'TB-rel';
    } else {
        path.Type = 'noise';
    }
};

var identify_critical_time = function(path) {
    var epi = path.Episode;
    path.StartTime = epi[0].Time;
    path.EvaluationTime = epi.filter(function(e) {return e.Eva != "None" | e.Tre != "None";})[0].Time; 
    path.ConfirmationTime = epi.filter(function(e) {return e.Tre == "1st" | e.Tre == "2nd";})[0].Time;
    var tres = epi.filter(function(e) {return e.Eva != "Dead" & e.Tre != "None" & e.Tre != "End";});
    path.TreatmentStartTime = tres[0].Time;
    
    for (var i=epi.length-1; i > 0; i -=1) {
        var e = epi[i];
        if (e.Tre != "None" & e.Tre != "End") {
            break
        }
        path.TreatmentEndTime = epi[i].Time;
    }
    path.EndTime = epi[epi.length-1].Time;
};

var label_stages = function(path) {
    function getEvaType(e) {
        if (e.Tre == "Emp") {
            return "Evaluating: Empirical treatment";
        }  else if (e.Eva == "Slight") {
            return "Evaluating: Less relevant test";
        } else if (e.Eva == "Strong") {
            return "Evaluating: High relevant test";
        }
        return "Evaluating: Awareness lost";
    }
    
    var pattern = [];
    var epi = path.Episode;
    
    pattern.push({Time: path.StartTime, Stage: "Start"});
    if (path.StartTime < path.EvaluationTime) {
        pattern.push({Time: path.StartTime, Stage: "Leading: "+epi[0].Pre});
    } 
    if (path.EvaluationTime < path.ConfirmationTime) {
        var last;
        epi.filter(function(e) {return e.Time < path.ConfirmationTime & e.Time >= path.EvaluationTime;})
           .forEach(function(e) {
                var stage = getEvaType(e); 
                if (stage != last) {
                    pattern.push({Time: e.Time, Stage: getEvaType(e)});
                    last = stage;
                }
            })
    } 
    pattern.push({Time: path.ConfirmationTime, Stage: "Confirmation"});
    
    var trs = epi.filter(function(e) {return e.Tre == "1st" | e.Tre == "2nd";});
    
    if (trs[0].Tre == "1st") {
        pattern.push({Time: trs[0].Time, Stage: "AntiTB: 1st line"});
        trs = trs.filter(function(e) {return e.Tre == "2nd";})
        if (trs.length > 0) {
            pattern.push({Time: trs[0].Time, Stage: "AntiTB: 2nd line"});
        }
    } else {
        pattern.push({Time: trs[0].Time, Stage: "AntiTB: 2nd line"});
    }
    pattern.push({Time: path.TreatmentEndTime, Stage: "End Treatment"})
        
    
    
    pattern.push({Time: path.EndTime, Stage: "End"});
    
    path.Pattern = pattern;
    
};

var find_statistics = function(path) {
    var stats = {};
    
    stats.Notification = path.ConfirmationTime;
    stats.DiagnosisDelay = path.ConfirmationTime - path.EvaluationTime;
    stats.EvaluationDelay = path.EvaluationTime - path.StartTime;
    stats.EmpiricalTreatment = (path.Pattern.filter(function(e) {return e.Stage=="Evaluating: Empirical treatment"}).length)? "Yes": "No";
    stats.LostAwareness = (path.Pattern.filter(function(e) {return e.Stage=="Evaluating: Awareness lost"}).length)? "Yes": "No"; 
    
    var end = path.Episode[path.Episode.length-1];
    stats.Outcome = (path.TreatmentEndTime-path.TreatmentStartTime > 180)? "Completed": 
                    (end.Eva == "None")? "Loss to follow-up":
                    (end.Eva == "Dead")? "Dead": "Censored";
    path.Statistics = stats;
}

var id = "ID_103";

var records = data[id];

console.log(records.length);

var recs = records.map(function(rec) {return new Record(rec);});
recs = recs.filter(function(rec) {return rec.Event !== undefined;})
           .sort(function(a, b) {return a.Time-b.Time;});

recs.forEach(function(rec) {console.log(rec.Time, rec.Event);})
var out = recs[recs.length-1].Out;
console.log("Pre Evaluation");
var pre = new PreEvaluation(tos.TimeoutPre);
recs.forEach(function(rec) {pre.update(rec.Event, rec.Time)});
pre.close((out == 3651)?'End': 'Dead', out);
pre.History.forEach(function(rec) {console.log(rec);});

console.log("Evaluation");
var eva = new Evaluation(tos.TimeoutEva);
recs.forEach(function(rec) {eva.update(rec.Event, rec.Time)});
eva.close((out == 3651)?'End': 'Dead', out);
eva.History.forEach(function(rec) {console.log(rec);});

console.log("Treatment");
var tre = new Treatment(tos.TimeoutTre);
recs.forEach(function(rec) {tre.update(rec.Event, rec.Time)});
tre.close((out == 3651)?'End': 'Dead', out);
tre.History.forEach(function(rec) {console.log(rec);});
console.log("Drug")
tre.DrugHistory.forEach(function(rec) {console.log(rec);});

var epi = align_episode(pre, eva, tre);
console.log(epi);

var cps = find_cutpoints(epi);
console.log(cps);

var paths = cut_pathways(epi, cps);

paths.forEach(label_pathways);

paths.forEach(function(rec) {console.log();console.log(rec);});

var tb_paths = paths.filter(function(path) {return path.Type == "TB"});

tb_paths.forEach(identify_critical_time);
tb_paths.forEach(label_stages);
tb_paths.forEach(find_statistics);

tb_paths.forEach(function(rec) {console.log();console.log(rec.Statistics);});

