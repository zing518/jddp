/**
 * cron: 20 0 0 * * *
*/
console.log('当前版本号', '20221209-v1.0，捡漏助力！不想跑的禁用')
console.log('若脚本报错则增加变量TK_SIGN_method为planb再试一次，还不行就用旧脚本！')
const yxl = require('./depend/yxl')
const $ = new yxl.Env('成成助力（店铺签到专用）');
const notify = $.isNode() ? require('./sendNotify') : '';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
if(process.env.TK_SIGN_method&&process.env.TK_SIGN_method=='planb'){
    $.changeplan=true
}else{
    $.changeplan=false
}
if (process.env.TK_SIGN_ID) {
    $.TK_SIGN_ID = process.env.TK_SIGN_ID || ''
    $.TK_SIGN_SIGN = process.env.TK_SIGN_SIGN || ''
    $.TK_SIGN = { id: $.TK_SIGN_ID, sign: $.TK_SIGN_SIGN }
} else if (process.env.TK_SIGN) {
    $.TK_SIGN = process.env.TK_SIGN
    $.TK_SIGN = $.toObj($.TK_SIGN, $.TK_SIGN)
} else {
    console.log('联系@dpqd_boss获取TK_SIGN.')
}



//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '', message;
let uuid, UA;
$.shareCodes = []
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  })
  if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
} else {
  cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}
const JD_API_HOST = 'https://api.m.jd.com/client.action';

!(async () => {
    console.log(typeof $.TK_SIGN.id,`TK_SIGN.id:${$.toStr($.TK_SIGN.id)}`);

    await $.wait(yxl.randomNumber(1000, 10000))
    $.apidata = await yxl[$.changeplan?'readapi1':'readapi']('TOKEN',$.TK_SIGN.id,$.TK_SIGN.sign)

    $.apidata=$.toObj($.apidata,$.apidata)
    if(typeof $.apidata != "object"){
        $.apidata = []
        return
    }
    if (process.env.TK_SIGN_info&&process.env.TK_SIGN_info==="info"){
        console.log(`截图报错日志发到群里！`)
    } else{
        console.log(`如果报错，增加变量TK_SIGN_info值为info可显示详细报错原因！`)
        console.info = () => { }
    }

  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
    return;
  }
  
  for (let i = 0; i < cookiesArr.length; i++) {
    cookie = cookiesArr[i];
    $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
    $.index = i + 1;
    UA = `jdapp;iPhone;10.2.0;13.1.2;${randomString(40)};M/5.0;network/wifi;ADID/;model/iPhone8,1;addressid/2308460611;appBuild/167853;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1;`
    uuid = UA.split(';')[4]

    let shareCodes;
    shareCodes = $.apidata.city
    shareCodes=$.toObj(shareCodes,shareCodes)

    for (let j = 0; j < shareCodes.length; j++) {
      console.log(`${$.UserName} 开始助力 【${shareCodes[j]}】`)
      // await $.wait(1000)
      let res = await getInfo(shareCodes[j])
      if (res && res['data'] && res['data']['bizCode'] === 0) {
        if (res['data']['result']['toasts'] && res['data']['result']['toasts'][0] && res['data']['result']['toasts'][0]['status'] === '3') {
          console.log(`助力次数已耗尽，跳出`)
          break
        }
        if (res['data']['result']['toasts']) {
          if (res['data']['result']['toasts'][0]) {
            console.log(`助力 【${shareCodes[j]}】:${res.data.result.toasts[0].msg}`)
          } else {
            console.log(`未知错误，跳出`)
            break
          }
        }
      }
      if ((res && res['status'] && res['status'] === '3') || (res && res.data && res.data.bizCode === -11)) {
        // 助力次数耗尽 || 黑号
        break
      }
    }
    await $.wait(1000)
    await getInviteInfo();//雇佣

  }
})()
  .catch((e) => {
    $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
  })
  .finally(() => {
    $.done();
  })

function getInfo(inviteId, flag = false) {
  let body = {"lbsCity":"15","realLbsCity":"1233","inviteId":inviteId,"headImg":"","userName":"","taskChannel":"1","location":"120.609447,28.008608","safeStr":"{\"log\":\"1670641344954~1IhSJ07xy5Hb9e0a8a1c3f5069f279573386bc2b0ca~2%2C1~DAE3A246635C7918B7768488835F98AC693B4195~0anfbmv~C~TRFFXhYKbW4dEUBeWxELaGkcFFRDXRYKBx8TQEcSDBEABQMAAAcAAAAEAwIIAg0CDxEdEUNVUhELEUBEQkdFVUFWFB8TRFFRFAkTVVJEV0dQRlVRFB8TQ1BeFAlqBBgJGgUdCxgBGgZsHxZaXBELAhgSVUATCRYJUgRVCwICBgQFCwYAAFFUUlABUAQAVwwIA1ZSC1UGBBEdEVpAFAkTf11eQ0sRUlVCVVsHBxYcFEcTCRYBAAQBBQABBQcFCgEEFB8TWV8SDBEcUgAJVAdXAAIFDwFSHgBVBQNVV1UHAwIJUAwJAwUcCgACV1dVVlAFVwcBVgZVBFIGClUGBgBUB1dSDlcJUABUAgEBBBYcFFVBURYKFEAJBmZ9A0YBZWRkY3hfQVAdQUt6SkNxFB8TXUISDBF2XFtXWlYRelpTGBEdEVpRQBELEQ0IAgYDERgSRVBDEQ5rAQsBHwcGBm4dEUZfFAlqEXd%2FZB5wfwUAFB8TUlpURFxYVxYcFAoTHxYBBx0CHQYSGhEICwAFBBEdEQADAwUCAAQDAgUFBQUGAQAcBgcBBQsCAAIIBQoCBgcGBREdEQUSax8TWltRFAkTVVJWUFVXR0ASGhFQWRYKFEYTHxZTXxELEUMEGAMfBhYcFFBXbEISDBEBAxYcFFFVEQ4SRFJfV1tdCwIJBgUJAQsBERgSW1kTCW8AGgMdA2kcFFFdXFMSDBEABQMAAAcAAAYAAgQCTQV%2FUgp5UAV0WUdBUQ1VBlIJUgVTBVUEAwIJUAEGCgEHBQAJBVZTBFEBUFVOTB8ATUpOdE1ldlB4c3UJZWMBRmp2Ag1xYHFjYWxIRmFmYm54bnJZZ2cBWmd0dVhSbmVze3JiXWtwW219cFt4UWV2b2FmS2F1cEsEe2J2A0JgS1d%2BcERnZ3JYWWRjcWJpcER%2FZXV2b2t5WFBVZVtSY3JHVWlzZnFpcHVdcnJmUWtkcn5ldFtSVmYBWVJ1S1docUtVZHdYb353X3l1YnJ0YXxxCw5PAlJbDwsISRYcFF5CVBYKFBEdEUxTRBELEVUSSw%3D%3D~1yezx1b\",\"sceneid\":\"CHFhPageh5\",\"random\":\"18519780\"}"}
  //let body = {"lbsCity":"1","realLbsCity":"2953","inviteId":inviteId,"headImg":"","userName":"","taskChannel":"1","location":"","safeStr":""}
  return new Promise((resolve) => {
    let temp  = taskPostUrl("city_getHomeDatav1",body)
    //console.log(temp) 
    $.post(temp, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (safeGet(data)) {
            //console.log(data)
            data = JSON.parse(data);
            if (data.code === 0) {
              if (data.data && data['data']['bizCode'] === 0) {
                if (flag) {
                  console.log(`【京东账号${$.index}（${$.UserName}）的${$.name}好友互助码】${data.data && data.data.result.userActBaseInfo.inviteId}`);
                  if (data.data && data.data.result.userActBaseInfo.inviteId) {
                    $.shareCodes.push(data.data.result.userActBaseInfo.inviteId)
                  }
                  console.log(`剩余金额：${data.data.result.userActBaseInfo.poolMoney}`)
                  for (let pop of data.data.result.popWindows || []) {
                    if (pop.data.cash && (pop.data.cash !== data.data.result.userActBaseInfo.poolMoney)) {
                      await receiveCash("", "2");
                    }
                  }
                  
                }
                for (let vo of data.data.result && data.data.result.mainInfos || []) {
                  if (vo && vo.remaingAssistNum === 0 && vo.status === "1") {
                    console.log(vo.roundNum)
                    await receiveCash(vo.roundNum)
                    await $.wait(2 * 1000)
                  }
                }
              } else {
                console.log(`\n\n${inviteId ? '助力好友' : '获取邀请码'}失败:${data.data.bizMsg}`)
                if (flag) {
                  if (data.data && !data.data.result.userActBaseInfo.inviteId) {
                    console.log(`账号已黑，看不到邀请码\n`);
                  }
                }
              }
            } else {
              console.log(`\n\ncity_getHomeData失败:${JSON.stringify(data)}\n`)
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
function receiveCash(roundNum, type = '') {
  let body = {"cashType":1,"roundNum":roundNum}
  if (type) body = {"cashType":type}
  return new Promise((resolve) => {
    $.post(taskPostUrl("city_receiveCash", body), async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (safeGet(data)) {
            //console.log(`领红包结果${data}`);
            data = JSON.parse(data);
            if (data['data']['bizCode'] === 0) {
              //console.log(`获得 ${data.data.result.currentTimeCash} 元，共计 ${data.data.result.totalCash} 元`)
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
function getInviteInfo() {
  let body = {}
  return new Promise((resolve) => {
    $.post(taskPostUrl("city_masterMainData",body), async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (safeGet(data)) {
            data = JSON.parse(data);
            if (data && (data.code === 0 && data.data.bizCode === 0)) {
              if (data.data.result.masterData.actStatus === 2) {
                await receiveCash("", "4")
                await $.wait(2000)
              }
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}


function taskPostUrl(functionId, body) {
  let t = Date.now()
  return {
    url: JD_API_HOST,
    //body: `functionId=${functionId}&body=${JSON.stringify(body)}&client=wh5&clientVersion=1.0.0&uuid=${uuid}`,
    body: `functionId=${functionId}&body=${JSON.stringify(body)}&appid=signed_wh5&osVersion=15.0.1&timestamp=${t}&&client=ios&clientVersion=11.3.0&openudid=${uuid}`,
    headers: {
      "Host": "api.m.jd.com",
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "https://bunearth.m.jd.com",
      "Accept-Language": "zh-CN,zh-Hans;q=0.9",
      "User-Agent": UA,
      "Referer": "https://bunearth.m.jd.com/",
      "Accept-Encoding": "gzip, deflate, br",
      "Cookie": cookie
    }
  }
}
function randomString(e) {
  e = e || 32;
  let t = "abcdef0123456789", a = t.length, n = "";
  for (let i = 0; i < e; i++)
    n += t.charAt(Math.floor(Math.random() * a));
  return n
}

function safeGet(data) {
  try {
    if (typeof JSON.parse(data) == "object") {
      return true;
    }
  } catch (e) {
    console.log(e);
    console.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
    return false;
  }
}
function jsonParse(str) {
  if (typeof str == "string") {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.log(e);
      $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
      return [];
    }
  }
}
