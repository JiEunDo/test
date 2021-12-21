const express = require("express");
const router = express.Router();
const template = require("../lib/template");
const calculatorTemplate = require("../lib/calculatorTemplate");
const db = require("../lib/db");

// const mysql = require("mysql");
// var url = require("url");

// router.get("/", function (request, response) {
//   let html = template.menu(
//     "일정 계산기",
//     calculatorTemplate.calculator(),
//     "홍길동"
//   );
//   response.send(html);
// });

router.get("/", function (request, response) {
  let email = request.session.email;
  db.query(
    `SELECT * FROM userTBL WHERE email = '${email}'`,
    function (error, user) {
      if (error) throw error;
      db.query(
        `SELECT friend2, name, profile FROM friendTBL left JOIN userTBL ON friend2 = email WHERE friend1=?`,
        [email],
        function (error, users) {
          db.query(
            "SELECT g_id, g_name, g_owner, COUNT(*)+1 as cnt FROM memberTBL JOIN groupTBL ON g_id = m_id WHERE g_owner=? GROUP BY g_id;",
            [email],
            function (error, groups) {
              let html = template.menu(
                "일정 계산기",
                calculatorTemplate.calculator(
                  calculatorTemplate.friendlist(groups, users)
                ),
                user[0].name,
                user[0].profile
              );
              response.send(html);
            }
          );
        }
      );
    }
  );
});

router.post("/calculator_process", function (request, response) {
  var ev = request.body;
  let combi_times = [];

  let list = [];
  let sql = "";
  if ("group" in ev) {
    for (i of ev.group) {
      sql += `g_id=${i} or `;
    }

    sql = sql.slice(0, -4);

    db.query(
      `SELECT g_id, g_owner, m_email FROM groupTBL JOIN memberTBL ON g_id = m_id WHERE ${sql}`,
      function (error, users) {
        for (let i = 0; i < users.length; i++) {
          list.push(users[i].m_email);
        }
        list = list.concat(ev.friend);
        list = list.filter((item, pos) => list.indexOf(item) === pos);

        sql = "";
        for (i of list) {
          sql += `a.user_email='${i}' or `;
        }
        sql = sql.slice(0, -4);

        let ch = function (n) {
          return n.length == 1 ? "0" + n : n + "";
        };

        let st = ch(ev.start_hour) + ":" + ch(ev.start_minute) + ":00";
        let lt = ch(ev.last_hour) + ":" + ch(ev.last_minute) + ":00";

        db.query(
          `SELECT a.event_no, a.start_date, a.end_date, a.start_time, a.end_time, a.isRepeat, b.re_day FROM eventTBL as a LEFT JOIN repeatEventTBL as b ON a.event_no = b.event_no WHERE (${sql}) and (SUBSTRING_INDEX (a.start_date, '-' ,2) like '${ev.combi_month}' or SUBSTRING_INDEX (a.end_date, '-', 2) like '${ev.combi_month}') and ((a.start_time < '${lt}') and (a.end_time > '${st}'));`,
          function (error, times) {
            console.log(times);
            for (let j = 1; j < 32; j++) {
              for (let k = 0; k < times.length; k++) {
                let okay = false;
                if (
                  times[k].start_date.slice(8, 10) * 1 <= j &&
                  j <= times[k].end_date.slic(8, 10)
                ) {
                  okay = true;
                  let check = false;
                  if (times[k].isRepeat == 1) {
                    let rep = times[k].re_day.split(",");
                    let day = new Date(
                      ev.combi_month.slice(0, 4),
                      ev.combi_month.slice(5, 7),
                      j
                    ).getDay();
                    for (item of rep) {
                      if (item == day) {
                        check = true;
                        break;
                      }
                    }
                  }
                  if (okay == false) combi_times.push(1);
                  else if (okay == true && check == false) combi_times.push(1);
                  else combi_times.push(0);
                }
              }
            }
          }
        );
      }
    );
  } else {
  }

  db.query(`SELECT * FROM userTBL WHERE email = '${request.session.email}'`, function(error, user){
    if(error){
        console.log(error); 
        throw error;
    }
    console.log(combi_times);
    let html = template.menu(
      "계산 결과",
      calculatorTemplate.result(
        calculatorTemplate.ym(ev.combi_month),
        calculatorTemplate.resdate(ev.combi_month, combi_times)
      ),
      user[0].name
    );
    response.send(html);

    // response.writeHead(302, { Location: `/date_calculator/result` });
    // response.end();
  });
});

// router.get("/result", function (request, response) {
//   console.log(request.body);
//   let dd = "2021-12";
//   let yn = [
//     1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0,
//     0, 0, 0, 1, 0, 0,
//   ];

// });

module.exports = router;