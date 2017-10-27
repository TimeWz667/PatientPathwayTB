var diags;

var pagerVis = function () {
    var width = null;
    var height = null;

    var margin = {
        top: 30,
        right: 10,
        bottom: 20,
        left: 50
    };

    var lastIndex = -1;
    var activeIndex = 0;

    var svg = null;
    var diagrams = null;
    var states3 = ["Related Dz", "Evaluation", "Treatment"];
    var statesN = ["NTM", "CLD", "ARD", "None Pre",
                   "1", "Strong", "Slight", "None Eva",
                   "2nd", "1st", "Emp", "None Tre"];

    var colourN = null;
    var activePathway = 0;

    var activateFunctions = [];

    var chart = function (selection) {
        selection.each(function (patient) {
            // create svg and give it a width and height

            svg = d3.select(this).append("svg");

            outer_width = d3.select(this).node().getBoundingClientRect().width;
            outer_height = outer_width * 0.85;
            width = +outer_width - margin.left - margin.right;
            height = +outer_height - margin.top - margin.bottom;

            svg.attr("height", height)
                .attr("width", width);

            diagrams = {};

            diagrams["Records"] = {
                g: svg.append("g"),
                full: {
                    top: margin.top,
                    left: margin.left,
                    rX: 0.9,
                    rY: 0.9
                },
                shrink: {
                    top: margin.top,
                    left: margin.left,
                    rX: 0.3,
                    rY: 0.2
                },
                elements: null
            }

            diagrams["Subfields"] = {
                g: svg.append("g"),
                full: {
                    top: margin.top,
                    left: margin.left,
                    rX: 0.9,
                    rY: 0.9
                },
                shrink: {
                    top: margin.top + height * 0.2,
                    left: margin.left,
                    rX: 0.3,
                    rY: 0.4
                },
                elements: null
            }

            diagrams["Episodes"] = {
                g: svg.append("g"),
                full: {
                    top: margin.top,
                    left: margin.left,
                    rX: 0.9,
                    rY: 0.9
                },
                shrink: {
                    top: margin.top + height * 0.6,
                    left: margin.left,
                    rX: 0.3,
                    rY: 0.4
                },
                elements: null
            }

            diagrams["Pathways"] = {
                g: svg.append("g"),
                full: {
                    top: margin.top,
                    left: margin.left,
                    rX: 0.9,
                    rY: 0.9
                },
                shrink: {
                    top: margin.top,
                    left: margin.left + width / 3,
                    rX: 2 / 3,
                    rY: 2/3
                },
                elements: null
            }
            d3.values(diagrams).forEach(function (diag) {
                diag.current = diag.full;
            });
            diags = diagrams;

            colourN = d3.scaleOrdinal(d3.schemeCategory20c).domain(statesN);

            setupVis(patient);
            setupSections();
        });
    };

    function setupVis(patient) {
        diagrams.Records.elements = (function () {
            var loc = diagrams.Records.current;
            var g = diagrams.Records.g;
            var h = height * loc.rY;
            var w = width * loc.rX;

            var x = d3.scaleLinear().domain([0, d3.max(patient.Records.map(function (d) {
                return d.Time;
            }))]).range([0, w]);

            var y = d3.scaleLinear().domain([0, 1]).range([0, h]);
            var y3 = d3.scaleBand().domain(statesN).range([0, h]).padding(0.25);

            patient.Records.forEach(function (d) {
                d.Rand = Math.random();
                d.Label = (d.Pre) ? "None Pre" : (d.Tre) ? "None Tre" : "None Eva";
                d.Timeout = (d.Pre) ? settings.Timeout.Pre : (d.Tre) ? settings.Timeout.Tre + d.Event.Drug.Days : settings.Timeout.Eva;
            });
            var points = g.selectAll(".record").data(patient.Records)
                .enter().append("circle").attr("class", "record")
                .attr("cx", (d) => x(d.Time))
                .attr("cy", (d) => y(d.Rand))
                .attr("r", 5).style("fill", "#777");
            var xAxis = d3.axisBottom(x);


//            g.append("g")
//                .attr("class", "x axis")
//                .attr("transform", "translate(0," + h + ")")
//                .call(xAxis)
//                .append("text")
//                .attr("class", "label")
//                .attr("x", w / 2)
//                .attr("y", -100)
//                .style("text-anchor", "end")
//                .text("Time");

            g.selectAll(".sub").data(["None Pre", "None Eva", "None Tre"])
                .enter()
                .append('text')
                .attr("class", "sub")
                .attr("x", x(0))
                .attr("y", (d) => y3(d) + 30)
                .text((d) => (d == "None Pre") ? "Related Dz" : (d == "None Tre") ? "Treatment" : "Evalution");

            return {
                spread: function () {
                    points.transition().duration(500)
                        .attr("cy", (d) => y(d.Rand))
                        .style("fill", "#777");
                    g.selectAll(".sub").style("opacity", 0);
                },
                align: function () {
                    points.transition().duration(500)
                        .attr("cy", (d) => y3(d.Label) - d.Rand * 20)
                        .style("fill", (d) => colourN(d.Label));
                    g.selectAll(".sub").style("opacity", 1);
                }
            };
        })();

        diagrams.Subfields.elements = (function () {
            let loc = diagrams.Subfields.current;
            let g = diagrams.Subfields.g;
            let h = height * loc.rY;
            let w = width * loc.rX;

            var x = d3.scaleLinear().domain([0, d3.max(patient.Records.map((d) => d.Time))]).range([0, w]);

            const yN = d3.scaleBand().domain(statesN).range([0, h]).padding(0.25);

            var points = g.selectAll(".record").data(patient.Records)
                .enter().append("circle").attr("class", "record")
                .attr("cx", (d) => x(d.Time))
                .attr("cy", (d) => yN(d.Label) - d.Rand * 20)
                .attr("r", 5).style("fill", (d) => colourN(d.Label));

            var timeouts = g.selectAll(".timeout").data(patient.Records)
                .enter().append("line").attr("class", "timeout")
                .attr("x1", (d) => x(d.Time))
                .attr("x2", (d) => x(d.Time + d.Timeout))
                .attr("y1", (d) => yN(d.Label) - d.Rand * 20)
                .attr("y2", (d) => yN(d.Label) - d.Rand * 20)
                .style("stroke", (d) => colourN(d.Label));
            console.log(patient);
            var xAxis = d3.axisBottom(x);

            patient.Histories.Pre.filter((v) => v.State == "None").forEach((v) => v.State = "None Pre")
            patient.Histories.Eva.filter((v) => v.State == "None").forEach((v) => v.State = "None Eva")
            patient.Histories.Tre.filter((v) => v.State == "None").forEach((v) => v.State = "None Tre")

            patient.Histories.Pre.forEach(function (v) {
                patient.Records
                    .filter((d) => (d.Label == "None Pre") & (d.Time >= v.Time) & (d.Time < v.End))
                    .forEach((d) => (d.State = v.State))
            });

            patient.Histories.Eva.forEach(function (v) {
                patient.Records
                    .filter((d) => (d.Label == "None Eva") & (d.Time >= v.Time) & (d.Time < v.End))
                    .forEach((d) => (d.State = v.State))
            });

            patient.Histories.Tre.forEach(function (v) {
                patient.Records
                    .filter((d) => (d.Label == "None Tre") & (d.Time >= v.Time) & (d.Time < v.End))
                    .forEach((d) => (d.State = v.State))
            });

            var hs = d3.values(patient.Histories).reduce((s, n) => s.concat(n), []);



            var paths = g.selectAll(".stage").data(hs)
                .enter().append("line").attr("class", "stage")
                .attr("x1", (d) => x(d.Time))
                .attr("x2", (d) => x(d.End))
                .attr("y1", (d) => yN(d.State))
                .attr("y2", (d) => yN(d.State))
                .attr("stroke-width", 3)
                .style("stroke", (d) => colourN(d.State));

//            g.append("g")
//                .attr("class", "x axis")
//                .attr("transform", "translate(0," + h + ")")
//                .call(xAxis)
//                .append("text")
//                .attr("class", "label")
//                .attr("x", w / 2)
//                .attr("y", -100)
//                .style("text-anchor", "end")
//                .text("Time");

            g.selectAll(".sub").data(["None Pre", "None Eva", "None Tre"])
                .enter()
                .append('text')
                .attr("class", "sub")
                .attr("x", x(0))
                .attr("y", (d) => yN(d) + 30)
                .text((d) => (d == "None Pre") ? "Related Dz" : (d == "None Tre") ? "Treatment" : "Evaluation");

            return {
                show_timeouts: function () {
                    timeouts.attr("x2", (d) => x(d.Time)).style("opacity", 1).transition().duration(500)
                        .attr("x2", (d) => x(d.Time + d.Timeout));
                },
                hide_timeouts: function () {
                    timeouts.style("opacity", 0);
                },
                show_paths: function () {
                    paths.attr("x2", (d) => x(d.Time))
                        .style("opacity", 1)
                        .transition().duration(500)
                        .attr("x2", (d) => x(d.End));
                },
                hide_paths: function () {
                    paths.style("opacity", 0);
                },
                hide_points: function () {
                    points.style("opacity", 1);
                },
                show_spread_points: function () {
                    points.attr("r", 5)
                        .attr("cy", (d) => yN(d.Label) - d.Rand * 20)
                        .style("fill", (d) => colourN(d.Label));
                },
                show_fitted_points: function () {
                    points
                        .transition().duration(500)
                        .attr("r", 2)
                        .attr("cy", (d) => yN(d.State))
                        .style("fill", (d) => colourN(d.State))
                }
            };
        })();

        diagrams.Episodes.elements = (function () {
            let loc = diagrams.Episodes.current;
            let g = diagrams.Episodes.g;
            let h = height * loc.rY;
            let w = width * loc.rX;

            const x = d3.scaleLinear().domain([0, d3.max(patient.Records.map((d) => d.Time))]).range([0, w]);

            const y3 = d3.scaleLinear().domain([0, 3]).range([0.1, h * 0.9]);

            var stages = patient.Episodes.map(function (e) {
                if (!e.Time) return [];
                return [
                    {
                        Time: e.Time,
                        End: e.End,
                        Stage: (e.Pre == "None") ? "None Pre" : e.Pre,
                        Label: 0
                    },
                    {
                        Time: e.Time,
                        End: e.End,
                        Stage: (e.Eva == "None") ? "None Eva" : e.Eva,
                        Label: 1
                    },
                    {
                        Time: e.Time,
                        End: e.End,
                        Stage: (e.Tre == "None") ? "None Tre" : e.Tre,
                        Label: 2
                    }
                ]
            }).reduce((s, a) => s.concat(a), []);

            var stages = g.selectAll(".stage").data(stages)
                .enter().append("rect").attr("class", "stage")
                .attr("x", (d) => x(d.Time))
                .attr("y", (d) => y3(d.Label))
                .attr("width", (d) => x(d.End - d.Time))
                .attr("height", (d) => y3(1))

                .style("fill", (d) => colourN(d.Stage)).style("stroke", (d) => colourN(d.Stage));

            var bands = g.selectAll(".cut").data(patient.Cutpoints)
                .enter().append("rect").attr("class", "cut")
                .attr("x", (d) => x(d.From))
                .attr("y", (d) => y3.range()[0])
                .attr("width", (d) => x(d.To - d.From))
                .attr("height", (d) => y3.range()[1] - y3.range()[0])
                .style("opacity", 0.8)
                .style("fill", "#FFF");


            var exc = g.selectAll(".exc").data(patient.AllPathways.filter((p) => p.Type != "TB"))
                .enter().append("rect").attr("class", "exc")
                .attr("x", (d) => x(d.StartTime))
                .attr("y", (d) => y3.range()[0])
                .attr("width", (d) => x(d.EndTime - d.StartTime))
                .attr("height", (d) => y3.range()[1] - y3.range()[0])
                .style("opacity", 0.8)
                .style("fill", "#CCC");

//            var xAxis = d3.axisBottom(x);
//            g.append("g")
//                .attr("class", "x axis")
//                .attr("transform", "translate(0," + h + ")")
//                .call(xAxis)
//                .append("text")
//                .attr("class", "label")
//                .attr("x", w / 2)
//                .attr("y", -100)
//                .style("text-anchor", "end")
//                .text("Time");



            return {
                show_bands: function () {
                    bands.transition().duration(100).style("opacity", 0.8);
                },
                hide_bands: function () {
                    bands.style("opacity", 0);
                },
                show_exc: function () {
                    exc.transition().duration(100).style("opacity", 0.8);
                },
                hide_exc: function () {
                    exc.transition().style("opacity", 0);
                }
            };
        })();

        diagrams.Pathways.elements = (function () {
            let loc = diagrams.Pathways.current;
            let g = diagrams.Pathways.g;
            let h = height * loc.rY;
            let w = width * loc.rX;

            const y = d3.scaleLinear().range([0, h]);

            const x3 = d3.scaleLinear().domain([0, 3]).range([0, w * 0.1]);

            activePathway = (patient.TBPathways[activePathway]) ? activePathway : 0;
            let path = patient.TBPathways[activePathway];

            y.domain([path.StartTime, path.EndTime]);

            var frag = path.Episode.map(function (e) {
                if (!e.Time | (e.Pre == "None" & e.Eva == "None" & e.Tre == "None")) return [];
                return [
                    {
                        Time: e.Time,
                        End: e.End,
                        Stage: e.Pre,
                        Label: 0
                    },
                    {
                        Time: e.Time,
                        End: e.End,
                        Stage: e.Eva,
                        Label: 1
                    },
                    {
                        Time: e.Time,
                        End: e.End,
                        Stage: e.Tre,
                        Label: 2
                    }
                ]
            }).reduce((s, a) => s.concat(a), []);

            var stages = g.selectAll(".stage").data(frag)
                .enter().append("rect").attr("class", "stage")
                .attr("x", (d) => x3(d.Label))
                .attr("y", (d) => y(d.Time))
                .attr("width", (d) => x3(1))
                .attr("height", (d) => Math.abs(y(d.Time) - y(d.End)))
                .style("fill", (d) => (statesN.indexOf(d.Stage) >= 0) ? colourN(d.Stage) : "#FFF")
                .style("stroke", (d) => (statesN.indexOf(d.Stage) >= 0) ? colourN(d.Stage) : "#FFF");


            var yTime = d3.scalePoint()
                .domain(["Start", "Evaluation", "Re-evaluation", "Confirmation", "End"]).range([0, h]).padding(0.1);

            var timings = g.selectAll(".timing").data(path.Timings).enter()
                .append("g");
            
            timings.append("circle")
                .attr("cy", (d) => yTime(d.Stage))
                .attr("cx", 0)
                .attr("r", 3)
                .style("fill", "#777")

            timings.append("text")
                .attr("y", (d) => yTime(d.Stage))
                .attr("x", 0)
                .attr("dy", 16)
                .text((d) => (d.Stage))
                .style("fill", "black")

            var timingLines = g.selectAll(".timingline").data(path.Timings).enter()
                .append("line")
                .attr("class", "timingline")
                .attr("x1", w * 0.1)
                .attr("x2", w / 3)
                .attr("y1", (d) => y(d.Time))
                .attr("y2", (d) => yTime(d.Stage))
                .style("stroke", "black")
                .style("stroke-dasharray", "5,2");

            var colour = d3.scaleOrdinal(d3.schemeCategory20c).domain(settings.Stages20);

            const forceStrength = 0.9, nodeSize = 15;
            let pathNodes = path.Pattern.map((e) => e);
            pathNodes.unshift({Stage: "Start", Time: path.StartTime});
            pathNodes.push({Stage: "End", Time: path.EndTime});
            console.log(pathNodes);
            let pathEdges = [];
            for (var i = 0; i < pathNodes.length - 1; i += 1) {
                pathEdges.push({
                    "source": pathNodes[i].Stage,
                    "target": pathNodes[i + 1].Stage
                });
            }

            const yLevel = d3.scaleBand().domain(settings.Stages4).range([0, h])
            var ts = Array.from(new Set(pathNodes.map((d) => d.Time))).sort(function (a, b) {
                return a - b;
            });
            const xTime = d3.scaleBand().domain(ts).range([w * 0.3, w * 0.6]);

            pathNodes.forEach((e) => console.log(settings.Levels[e.Stage]))
            force = d3.forceSimulation().nodes(pathNodes)
                .velocityDecay(0.6)
                .force("link", d3.forceLink().links(pathEdges).id((d) => d.Stage).distance(120).strength(0.9))
                .force('x', d3.forceX((d) => (d.Stage=="Start")? xTime.range()[0]-50: (d.Stage=="End")? xTime.range()[1]+50: xTime(d.Time)).strength(forceStrength))
                .force('y', d3.forceY((d) => (d.Stage=="Start")? 0: (d.Stage=="End")? h*0.9: yLevel(settings.Levels[d.Stage])).strength(forceStrength))
                .force('charge', d3.forceManyBody(0.8))
                .force("collide", d3.forceCollide(0.2))
                .force("center", d3.forceCenter(w * 0.6, h / 2));
            //.force("links", d3.forceLink(pathEdges).strength(0.01));

            var nodes = g.selectAll(".node")
                .data(pathNodes)
                .enter().append("g")
                .attr("class", "node");


            nodes.append("circle")
                .attr("r", nodeSize)
                .style("fill", (d) => colour(d.Stage));


            var links = g.selectAll(".link")
                .data(pathEdges)
                .enter()
                .append("line")
                .attr("class", "link")
                .attr("stroke", (d) => (d.source.Stage =="Start" | d.target.Stage=="End")?"#ccc": "black")
            .style("stroke-width", (d) => (d.source.Stage =="Start" | d.target.Stage=="End")?1: 3)

            nodes.append("title")
                .text((d) => d.Stage);

            nodes.append("text")
                .attr("dy", 0)
                .attr("dx", nodeSize + 10)
                .text((d) => d.Stage);

            force.on("tick", function () {
                nodes.attr("transform", (d) => "translate(" + d.x + ", " + d.y + ")");
                links
                    .attr("x1", function (d) {
                        let angle = Math.atan2(d.target.x - d.source.x, d.target.y - d.source.y);
                        return d.source.x + Math.sin(angle) * nodeSize;
                    })
                    .attr("y1", function (d) {
                        let angle = Math.atan2(d.target.x - d.source.x, d.target.y - d.source.y);
                        return d.source.y + Math.cos(angle) * nodeSize;
                    })
                    .attr("x2", function (d) {
                        let angle = Math.atan2(d.target.x - d.source.x, d.target.y - d.source.y);
                        return d.target.x - Math.sin(angle) * nodeSize;
                    })
                    .attr("y2", function (d) {
                        let angle = Math.atan2(d.target.x - d.source.x, d.target.y - d.source.y);
                        return d.target.y - Math.cos(angle) * nodeSize;
                    });
            });
            
            var statistics = svg.append('g');
            
            var sts = [
                {Name: "EvaluationDelay", Desc: "Evaluation Delay"},
                {Name: "DiagnosisDelay", Desc: "Diagnosis Delay"},
                {Name: "LostAwareness", Desc: "Awareness Lost"},
                {Name: "EmpiricalTreatment", Desc: "Empirical Treatment used"},
                {Name: "Notification", Desc: "Day of Notification"},
                {Name: "Outcome", Desc: "Treatment Outcome"}
            ]
            sts.forEach(function(d, i) {
                statistics.append("text").text(d.Desc+":\t "+path.Statistics[d.Name])
                .attr("y", i*20).style("font-size", "12");
            })
            statistics.attr("transform", "translate("+(margin.left + width *1.5/ 3)+","+height*2.2/3+")")


            return {
                update_pathway: function () {

                },
                show_stages: function () {
                    stages.transition().duration(100).style("opacity", 1);
                },
                hide_stages: function () {
                    stages.style("opacity", 0);
                },
                show_timing: function () {
                    timings.transition().duration(100).style("opacity", 1);
                    timingLines.transition().duration(100).style("opacity", 1);
                    //timingLabels.transition().duration(100).style("opacity", 1);
                },
                hide_timing: function () {
                    timings.style("opacity", 0);
                    timingLines.style("opacity", 0);
                    //timingLabels.style("opacity", 0);
                },
                show_pathway: function () {
                    timingLines.style("opacity", 0);
                    timings.transition().duration(100).attr("transform",function(d) {
                        return  "translate(" + w/7 + ", 0)";
                    })
                        .style("opacity", 1);
                    //timingLabels.transition().duration(100).attr("x", w / 7).style("opacity", 0.8);
                    nodes.transition().duration(100).style("opacity", 0.8);
                    links.transition().duration(100).style("opacity", 0.8);
                },
                hide_pathway: function () {
                    timingLines.style("opacity", 0);
                    timings.attr("transform", (d) => "translate(" + w/3 + ", 0)");
                    //timingLabels.attr("x", w / 3);
                    nodes.style("opacity", 0);
                    links.style("opacity", 0);
                },
                show_statistics: function () {
                    statistics.style("opacity", 1);
                },
                hide_statistics: function () {
                    statistics.style("opacity", 0);
                } 
            };
        })();

        //console.log(node);
    };

    function setupSections() {
        activateFunctions[0] = showData;
        activateFunctions[1] = showCompletePathway;
        activateFunctions[2] = showLabelledData;
        activateFunctions[3] = showDataToSubfield;
        activateFunctions[4] = showTimeout;
        activateFunctions[5] = showSubepisodes;
        activateFunctions[6] = showEpisodes;
        activateFunctions[7] = showCutpoints;
        activateFunctions[8] = showNoise;
        activateFunctions[9] = showCrudePathway;
        activateFunctions[10] = showCriticalTime;
        activateFunctions[11] = showPathway;
        activateFunctions[12] = showCompletePathway;
    };

    function focusOn(sub) {
        var diag;
        for (var k in diagrams) {
            var loc;
            diag = diagrams[k];
            if (k == sub) {
                loc = diag.full;
                diag.current = loc;
                diag.g //.transition().duration(100)
                    .style("opacity", 1)
                    .attr("transform", "translate(" + loc.left + "," + loc.top + ")");
            } else {
                loc = diag.shrink;
                diag.current = loc;
                diag.g
                    .style("opacity", 0)
                    .attr("transform", "translate(" + loc.left + "," + loc.top + ")" + "scale(" + loc.rX + "," + loc.rY + ")");
            }
        }
    }

    function spreadAll() {
        for (var k in diagrams) {
            var diag = diagrams[k];
            loc = diag.shrink;
            diag.current = loc;
            diag.g.transition().duration(100)
                .style("opacity", 1)
                .attr("transform", "translate(" + loc.left + "," + loc.top + ")" + "scale(" + loc.rX + "," + loc.rY + ")");
        }
    }

    function showData() {
        focusOn("Records");
        diagrams.Records.elements.spread();
        diagrams.Pathways.elements.hide_statistics();
    }

    function showLabelledData() {
        focusOn("Records");
        diagrams.Pathways.elements.hide_statistics();
        diagrams.Records.elements.spread();
    }

    function showDataToSubfield() {
        focusOn("Records");
        diagrams.Records.elements.align();
    }

    function showTimeout() {
        focusOn("Subfields");
        diagrams.Subfields.elements.hide_paths();
        diagrams.Subfields.elements.show_spread_points();
        diagrams.Subfields.elements.show_timeouts();
    }

    function showSubepisodes() {
        focusOn("Subfields");
        diagrams.Subfields.elements.show_paths();
        diagrams.Subfields.elements.show_fitted_points();
        diagrams.Subfields.elements.hide_timeouts();
    }

    function showEpisodes() {
        focusOn("Episodes");
        diagrams.Episodes.elements.hide_exc();
        diagrams.Episodes.elements.hide_bands();
    }

    function showCutpoints() {
        focusOn("Episodes");
        diagrams.Episodes.elements.show_bands();
    }

    function showNoise() {
        focusOn("Episodes");
        diagrams.Episodes.elements.show_bands();
        diagrams.Episodes.elements.show_exc();
    }

    function showCrudePathway() {
        focusOn("Pathways");
        diagrams.Pathways.elements.show_stages();
        diagrams.Pathways.elements.hide_timing();
        diagrams.Pathways.elements.hide_pathway();
        diagrams.Pathways.elements.hide_statistics();
    }

    function showCriticalTime() {
        focusOn("Pathways");
        diagrams.Pathways.elements.show_stages();
        diagrams.Pathways.elements.show_timing();
        diagrams.Pathways.elements.hide_pathway();
        diagrams.Pathways.elements.hide_statistics();
    }

    function showPathway() {
        focusOn("Pathways");
        diagrams.Pathways.elements.hide_stages();
        diagrams.Pathways.elements.hide_timing();
        diagrams.Pathways.elements.show_pathway();
        diagrams.Pathways.elements.hide_statistics();
    }

    function showCompletePathway() {
        spreadAll();
        diagrams.Records.elements.spread();

        diagrams.Subfields.elements.hide_timeouts();
        diagrams.Subfields.elements.show_paths();
        diagrams.Subfields.elements.show_fitted_points();

        diagrams.Episodes.elements.show_bands();
        diagrams.Episodes.elements.show_exc();

        diagrams.Pathways.elements.hide_stages();
        diagrams.Pathways.elements.hide_timing();
        diagrams.Pathways.elements.show_pathway();
        diagrams.Pathways.elements.show_statistics();
    }

    chart.activate = function (index) {
        activeIndex = index;
        var sign = (activeIndex - lastIndex) < 0 ? -1 : 1;
        var scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
        scrolledSections.forEach((i) => activateFunctions[i]());
        lastIndex = activeIndex;
    };

    // return chart function
    return chart;
}


function display(data) {
    // create a new plot and
    // display it
    var patient = "ID_109";
    var plot = pagerVis();
    var pathways = formPathway(data);

    d3.select("#vis-canvas")
        .datum(pathways)
        .call(plot);

    var scroll = scroller()
        .container(d3.select('#graphic'));

    // pass in .step selection as the steps
    scroll(d3.selectAll('.step'));

    // setup event handling
    scroll.on('active', function (index) {
        // highlight current step text
        d3.selectAll('.step')
            .style('opacity', function (d, i) {
                return i === index ? 1 : 0.1;
            });
        // activate current section
        plot.activate(index);

    });


    plot.activate(0);
}


d3.json("data/psu.json", display);