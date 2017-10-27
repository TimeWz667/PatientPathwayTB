var pagerVis = function () {
  var width = null;
  var height = null;
  var adjText = -10;
  var center = {x: width / 2, y: height / 2};
  var forceStrength = 1, nodeSize = 20;

  var margin = {top: 30, right: 20, bottom: 30, left: 50};
    
  
  var lastIndex = -1;
  var activeIndex = 0;

  var svg = null, g, force;
  var node, link;
  var activateFunctions = [];

  var Data = {};
  var Groups = null;

  var chart = function (selection) {

    
    
    selection.each(function(rawData) {
      // create svg and give it a width and height
      svg = d3.select(this).append("svg");
      
      width = 900 - margin.left - margin.right;
      height = 900*0.8 - margin.top - margin.bottom;
      
      svg.attr("height", height)
         .attr("width", width);
      
      g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      Data.Nodes = getNodes(rawData);
      Data.Links = getLinks(Data.Nodes);
      updateData();
      setupVis();
      setupSections();
    });
  };

  function setupVis() {
    svg.selectAll("text.group").data(Groups)
      .enter()
      .append("text")
      .attr("class", "group")
      .attr("x", nodeSize)
      .attr("y", function(d) {return d.y-adjText;})
      .attr("opacity", function(d) {return d.Show? 1:0;})
      .text(function(d) {return d.Label;})
    
    force = d3.forceSimulation().nodes(Data.Nodes)
                  .velocityDecay(0.5)
                  .force('x', d3.forceX(function(d) {return d.posX;}).strength(forceStrength))
                  .force('y', d3.forceY(function(d) {return d.posY;}).strength(forceStrength))
                  .force('charge', d3.forceManyBody(0.1))
                  .force("collide", d3.forceCollide(1))
                  .force("links", d3.forceLink(Data.Links).strength(0.01));

    var linkG = g.append("g").attr("class", "links"),
        nodeG = g.append("g").attr("class", "nodes");

    svg.append("defs").selectAll("marker")
      .data(["arrowhead"])
      .enter().append("svg:marker")
         .attr("id", String)
         .attr("viewBox", "-0 -5 10 10")
         .attr("refX", 10)
         .attr("refY", 0)
         .attr("orient", "auto")
         .attr("markerWidth", 6)
         .attr("markerHeight", 13)
         .attr("xoverflow", "visible")
      .append("svg:path")
         .attr("d", "M 0,-5 L 10,0 L 0,5")
         .style("stroke", "none");

    link = linkG.selectAll("line")
                  .data(Data.Links)
                  .enter().append("line").attr("class", "edge")
                    .attr("marker-end", "url(#arrowhead)")
                    .attr("stroke-width", 2)
                    .attr("fill", function(d) {return d.Type=="Flow"?"#4008D4":"#FFA277";})
                    .style("stroke", function(d) {return d.Type=="Flow"?"#4008D4":"#FFA277";})
    .style("stroke-width", function(d) {return d.Type=="Flow"?2.5:1.5;});

    node = nodeG.selectAll("g").data(Data.Nodes);

    var nodeE = node.enter().append("g");

    nodeE.append("rect")
            .attr("class", "node-rect")
            .attr("y", -nodeSize)
            .attr("rx", nodeSize)
            .attr("ry", nodeSize)
            .attr("height", nodeSize*2)
            .attr("fill", "white")
            .style("stroke", "#111111");

    nodeE.append("text").attr("class", "node-text")
        .style("text-anchor", "middle")
        .style("alignment-baseline", "middle")
        .style("font-size", "20px");

    node = node.merge(nodeE);

    //updateLocation();

    node.select(".node-text")
        .text(function(d) {return d.Name;})
        .each(function(d) {
          var circleWidth = nodeSize *2,
              textLength = this.getComputedTextLength(),
              textWidth = textLength + nodeSize;

          if (circleWidth > textWidth) {
            d.isCircle = true;
            d.rectX = -nodeSize;
            d.rectWidth = circleWidth;
          } else {
            d.isCircle = false;
            d.rectX = -(textLength + nodeSize) / 2
            d.rectWidth = textWidth;
            d.textLength = textLength;
          }
        });

    node.select(".node-rect")
        .attr("x", function (d) { return d.rectX;})
        .attr("width", function (d) { return d.rectWidth; });

    force.on("tick", function() {
      node.each(function (d) {
        if (d.isCircle) {
          d.leftX = d.rightX = d.x;
        } else {
          d.leftX = d.x - d.textLength / 2 + nodeSize / 2;
          d.rightX = d.x + d.textLength / 2 - nodeSize /2;
        }
      })
      .attr("transform", function(d) { return "translate("+d.x+","+d.y+")"});
      //.attr("x", function(d) {return d.rectX;})
      //.attr("y", function(d) {return d.y-nodeSize;})


      link.each(function (d) {
        var srcX, tarX, midX, dx, dy, angle;

        if (d.source.rightX < d.target.leftX) {
          srcX = d.source.rightX;
          tarX = d.target.leftX;
        } else if (d.target.rightX < d.source.leftX) {
          srcX = d.source.leftX;
          tarX = d.target.rightX;
        } else if (d.target.isCircle) {
          srcX = tarX = d.target.x;
        } else if (d.source.isCircle) {
          srcX = tarX = d.source.x;
        } else {
          midX = (d.source.x + d.target.x)/2;
          if (midX > d.target.rightX) {
            midX = d.target.rightX;
          } else if (midX > d.source.rightX) {
            midX = d.source.rightX;
          } else if (midX < d.target.leftX) {
            midX = d.target.leftX;
          } else if (midX < d.source.leftX)  {
            midX = d.source.leftX;
          }
          tarX = srcX = midX;
        }
        dx = tarX - srcX;
        dy = d.target.y - d.source.y;
        angle = Math.atan2(dx, dy);

        d.srcX = srcX + Math.sin(angle) * nodeSize;
        d.tarX = tarX - Math.sin(angle) * nodeSize;
        d.srcY = d.source.y + Math.cos(angle) * nodeSize;
        d.tarY = d.target.y - Math.cos(angle) * nodeSize;
      })
      .attr("x1", function(d) {return d.srcX;})
      .attr("y1", function(d) {return d.srcY;})
      .attr("x2", function(d) {return d.tarX;})
      .attr("y2", function(d) {return d.tarY;});
    });
    //console.log(node);
  };

  function setupSections() {
    activateFunctions[0] = step0;
    activateFunctions[1] = step1;
    activateFunctions[2] = step2;
    activateFunctions[3] = step3;
    activateFunctions[4] = step4;
    activateFunctions[5] = step5;
    activateFunctions[6] = step6;
    activateFunctions[7] = step7;
  };

  function updateData(show) {
    var levels = ["Determinant", "Process", "Transition", "State", "Outcome"];
    var show = show||Data.Nodes.map(function(d) { return d.Name;});
    var sel = Data.Nodes.filter(function(d) {return show.indexOf(d.Name) >= 0});

    Data.Nodes.filter(function(d) {return show.indexOf(d.Name) < 0})
              .forEach(function(d) {d.Show = false;})

    var cnt = sel.reduce(function(t, x) {
      x.Show = true;
      if (x.Level in t) {t[x.Level] += 1;}
      else {t[x.Level] = 1;}
      return t;
    }, {});

    var positionY = {}, i = 0;
    Groups = [];
    levels.forEach(function (s) {
      if (s in cnt) {
        positionY[s] = height*0.15 + height*0.8*i/Object.keys(cnt).length;
        i ++;
        Groups.push({"Label": s, "y": positionY[s], "Show": true});
      } else {
        Groups.push({"Label": s, "y": height*0.15 + height*0.8*i/Object.keys(cnt).length, "Show": false});
      }
    });
    //console.log(positionY)
    sel.forEach(function (d) { d.posY = positionY[d.Level];});

    d3.keys(cnt).forEach(function (s) {
      var n = cnt[s], j = 0, intv = width/(n+1);
      sel.filter(function (d) {return d.Level == s;})
           .forEach(function (d) {
             d.posX = intv*(3/4+j);
             j ++;
           });
    });
  }

  function updateVis() {
    var txt = svg.selectAll("text.group").data(Groups);
    //console.log(Groups);
    txt.transition()
    .duration(500)
      .attr("y", function(d) {return d.y-adjText;})
       .attr("opacity", function(d) {return d.Show? 1:0;})
       .text(function(d) {return d.Label;});
//    
//    txt.enter()
//      .append("text")
//      .attr("class", "group")
//      .attr("x", nodeSize)
//      .attr("y", function(d) {return d.y-nodeSize;})
//      .text(function(d) {return d.Label;});
//    
//    txt.exit().remove();
    
    node.transition()
        .duration(200)
        .attr("opacity", function(d) {return d.Show? 1:0.01;})
        .attr("fill", function(d) {return d.Highlighted? "red":"#111111";});;

    link.transition()
        .duration(200)
        .attr("opacity", function(d) {return (d.source.Show && d.target.Show)? 1:0.01;});;

    force.force('x', d3.forceX(function(d) {return d.posX;}).strength(forceStrength))
         .force('y', d3.forceY(function(d) {return d.posY;}).strength(forceStrength))
         .alphaTarget(0.02).restart();
  }

  function highlightNode(hi) {
    Data.Nodes.forEach(function(d) {
      if (hi.indexOf(d.Name) >= 0) {
        d.Highlighted = true;
      } else {
        d.Highlighted = false;
      }
    });
  }

    function step0() {
    updateData(["SES","Care Seeking", "TB Dynamics"]);
    highlightNode([]);
    updateVis();
  }
  
  function step1() {
    updateData(["Age Sex Loc", "SES",
            "Transmission", "Patient Delay", "System Delay", "Treatment",
            "Activation", "Infection", "Recovery", "TB Death",
            "Susceptible", "Active TB", "Latent", "Dead", "Recovered",
            "Incidence", "Mortality", "Prevalence", "QOL"]);
    highlightNode([]);
    updateVis();
  }

  function step2() {
    updateData(["System Delay", "Treatment", "Recovery", "TB Death"]);
    highlightNode([]);
    updateVis();
  }

  function step3() {
    updateData(["Age Sex Loc", "SES", "System Delay", "Treatment", "Recovery", "TB Death"]);
    highlightNode(["Age Sex Loc", "SES"]);
    updateVis();
  }

  function step4() {
    updateData(["Age Sex Loc", "SES",
                "Transmission", "System Delay", "Treatment",
                "Recovery", "TB Death",
                "Active TB", "Dead", "Recovered"]);
    highlightNode(["Transmission", "Active TB", "Dead", "Recovered"]);
    updateVis();
  }

  function step5() {
    updateData(["Age Sex Loc", "SES",
                "Transmission", "System Delay", "Treatment",
                "Activation", "Infection", "Recovery", "TB Death",
                "Susceptible", "Active TB", "Latent", "Dead", "Recovered"]);
    highlightNode(["Activation", "Infection", "Susceptible", "Latent"]);
    updateVis();
  }

  function step6() {
    updateData(["Age Sex Loc", "SES",
                "Transmission", "Patient Delay", "System Delay", "Treatment",
                "Activation", "Infection", "Recovery", "TB Death",
                "Susceptible", "Active TB", "Latent", "Dead", "Recovered",
                "Incidence", "Mortality"]);
    highlightNode(["Patient Delay", "Incidence", "Mortality"]);
    updateVis();
  }

  function step7() {
    updateData(["Age Sex Loc", "SES",
                "Transmission", "Patient Delay", "System Delay", "Treatment",
                "Activation", "Infection", "Recovery", "TB Death",
                "Susceptible", "Active TB", "Latent", "Dead", "Recovered",
                "Incidence", "Mortality", "Prevalence", "QOL"]);
    highlightNode(["SES", "Prevalence", "Incidence", "Mortality", "QOL"]);
    updateVis();
  }

  function getNodes(data) {
    return data;
  }

  function getLinks(nodes) {
    var liks = [];

    for (var i in nodes) {
      var src, tar;
      src = nodes[i];
      if (src.Parents) {
        src.Parents.forEach(function(p) {
          var j = nodes.findIndex(function(node) {return node.Name == p;});
          if (j >= 0) liks.push({'source': j, "target": parseInt(i), "Type": "Determinant"});
        })
      }
      if (src.In) {
        var j = nodes.findIndex(function(node) {return node.Name == src.In;});
        if (j >= 0) liks.push({'source': j, "target": parseInt(i), "Type": "Flow"});
      }
    }
    return liks;
  }

  chart.activate = function(index) {
    activeIndex = index;
    var sign = (activeIndex - lastIndex) < 0 ? -1 : 1;
    var scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
    scrolledSections.forEach(function (i) {
      activateFunctions[i]();
    });
    lastIndex = activeIndex;
  };

  // return chart function
  return chart;
}


function display(data) {
  // create a new plot and
  // display it
  var plot = pagerVis();
  d3.select("#vis-canvas")
    .datum(data)
    .call(plot);

  var scroll = scroller()
    .container(d3.select('#graphic'));

  // pass in .step selection as the steps
  scroll(d3.selectAll('.step'));

  // setup event handling
  scroll.on('active', function (index) {
    // highlight current step text
    d3.selectAll('.step')
      .style('opacity', function (d, i) { return i === index ? 1 : 0.1; });

    // activate current section
    plot.activate(index);
  });


  plot.activate(0);
}


d3.json("data/records.json", display);
