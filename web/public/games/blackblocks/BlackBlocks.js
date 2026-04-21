function $(id) {
  return document.getElementById(id);
}

function creatediv(className) {
  var div = document.createElement("div");
  div.className = className;
  return div;
}

var clock = null;
var state = 0;
var speed = 6;
var flag = false;

function start() {
  if (!flag) {
    init();
  } else {
    alert('游戏已经开始，无需再次点击！');
  }
}
function init() {
  flag = true;
  for (var i = 0; i < 4; i++) {
    createrow();
  }

  $('main').onclick = function (ev) {
    ev = ev || event
    judge(ev);
  }
  clock = window.setInterval('move()', 30);
}

function createrow() {
  var con = $('con');
  var row = creatediv("row");
  var arr = createcell();

  con.appendChild(row);

  for (var i = 0; i < 4; i++) {
    row.appendChild(creatediv(arr[i]));
  }
  if (con.firstChild == null) {
    con.appendChild(row);
  } else {
    con.insertBefore(row, con.firstChild);
  }
}

function delrow() {
  var con = $('con');
  if (con.childNodes.length == 6) {
    con.removeChild(con.lastChild);

  }
}

function createcell() {
  var temp = ['cell', 'cell', 'cell', 'cell',];
  var i = Math.floor(Math.random() * 4);
  temp[i] = 'cell black';
  return temp;
}

function move() {
  var con = $('con');
  var top = parseInt(window.getComputedStyle(con, null)['top']);

  if (speed + top > 0) {
    top = 0;
  } else {
    top += speed;
  }

  con.style.top = top + 'px';
  over();
  if (top == 0) {
    createrow();
    con.style.top = '-101px';
    delrow();
  }


}

function speedup() {
  speed += 2;
  if (speed == 20) {
    alert('你超神了！');
  }
}

function over() {
  var rows = con.childNodes;
  if ((rows.length == 5) && (rows[rows.length - 1].pass !== 1)) {
    fail();
  }
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].pass1 == 1) {
      fail();
    }
  }
}

function fail() {
  clearInterval(clock);
  flag = false;
  confirm('你的最终得分 ' + parseInt($('score').innerHTML));
  var con = $('con');
  con.innerHTML = "";
  $('score').innerHTML = 0;
  con.style.top = '-408px';
}

function judge(ev) {
  if (ev.target.className.indexOf('black') == -1 && ev.target.className.indexOf('cell') != -1) {
    ev.target.parentNode.pass1 = 1;

  }
  if (ev.target.className.indexOf('black') != -1) {
    ev.target.className = 'cell';
    ev.target.parentNode.pass = 1;
    score();
  }
}

function score() {
  var newscore = parseInt($('score').innerHTML) + 1;
  $('score').innerHTML = newscore;
  if (newscore % 10 == 0) {
    speedup();
  }

}
