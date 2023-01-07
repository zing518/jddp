/**
 * cron: 59 20,23 * * *
 * 增加变量TK_SIGN_WAIT，控制零点店铺签到间隔，单位是秒，不是毫秒。默认是1s。
 * 定时不要增加，单日请求次数用完你就获取不到数据了。青龙配置文件随机延迟取消即RandomDelay=""。
 * 想跑几个号自己在定时任务命令后面加限制,如何限制去百度，问我也不知道，脚本内部不做限制。
 * 默认不推送通知，可以添加环境变量NOTIFY_DPQD为true开启，能不能签到豆查询就好了，签到通知与否没关系。
 * 环境变量名称：TK_SIGN，环境变量值：{"id":*,"sign":"************************"}
 * 用上面的环境变量报读取出错则拆分为TK_SIGN_ID和TK_SIGN_SIGN两个变量，对应上面｛｝里的两个值，若不报错则忽略此行。
*/
console.log('当前版本号', '20230107-v1.0')
console.log('若脚本报错则增加变量TK_SIGN_method为planb再试一次！')
console.log('增加变量TK_SIGN_WAIT，控制零点店铺签到间隔，单位是秒，不是毫秒。默认是1s。')
console.log('增加变量TK_SIGN_delay，控制零点签到开始时间，单位是秒，不是毫秒。默认是-0.1s。\n主要是修正网络延迟，带-表示在0.0.0秒前0.1s开始。')
console.log('增加变量TK_SIGN_WAIT1，控制其他时段店铺签到间隔，单位是秒，不是毫秒。默认是10s，随机延迟10-20s。你设置成2，就是随机2-4s。')
const yxl = require('./depend/yxl')
let TK_SIGN
if (process.env.TK_SIGN) {
    TK_SIGN = JSON.parse(process.env.TK_SIGN)
}
if (process.env.TK_SIGN_ID && process.env.TK_SIGN_SIGN) {
    TK_SIGN = { id: process.env.TK_SIGN_ID, sign: process.env.TK_SIGN_SIGN }
}
if (!TK_SIGN) {
    console.log('联系@dpqd_boss获取TK_SIGN.')
    return
}
let interval = 1
if (process.env.TK_SIGN_WAIT && process.env.TK_SIGN_WAIT < 5) {
    interval = process.env.TK_SIGN_WAIT
}
let interval1 = 10
if (process.env.TK_SIGN_WAIT1 && process.env.TK_SIGN_WAIT1 < 10) {
    interval1 = process.env.TK_SIGN_WAIT1
}

const $ = new yxl.Env('店铺签到（自动更新）');
const notify = $.isNode() ? require('./sendNotify') : '';
const axios = require('axios')
const JD_API_HOST = 'https://api.m.jd.com/api?appid=interCenter_shopSign';
$.delay = process.env.TK_SIGN_delay || -0.1 //单位毫秒,与下一个零点时间差，delay正为提前，负为延迟
let nowHours = new Date().getHours()
let nowMinutes = new Date().getMinutes()
let cookiesArr = []
let token = []
let logtemp = []
let cookie = ''
let UserName = ''
let message = ''
let notify_dpqd = false
let emergency = []
let apidata
let control

if (process.env.NOTIFY_DPQD) { notify_dpqd = process.env.NOTIFY_DPQD } //凌晨签到是否通知，变量设置true则通知，默认不通知，估计影响签到网速，未验证。22点签到通知结果。
//时间格式
Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1
        .length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length ==
            1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}
if (process.env.TK_SIGN_method && process.env.TK_SIGN_method == 'planb') {
    $.changeplan = true
} else {
    $.changeplan = false
}
!(async () => {
    // 获取API接口数据
    apidata = await yxl[$.changeplan ? 'readapi1' : 'readapi']('TOKEN', TK_SIGN.id, TK_SIGN.sign)
    // 获取紧急通知
    emergency = apidata.notify
    if (nowHours < 23 && emergency !== "null") {
        console.log("\n====================通知====================\n", emergency)
        message += "\n======通知======\n" + emergency + "\n"
    }
    // 获取控制参数
    if (process.env.TK_SIGN_info && process.env.TK_SIGN_info === "info") {
        console.log(`截图报错日志发到群里！`)
    } else {
        console.log(`如果报错，增加变量TK_SIGN_info值为info可显示详细报错原因！`)
        console.info = () => { }
    }
    control = apidata.control
    control = $.toObj(control, control)
    if (control.qd === "off") {
        console.log("\n店铺签到暂停！！")
    }
    // 获取签到token
    token = apidata.dptk
    token = $.toObj(token, token)

    console.info("获取签到数据：", token)
    cookiesArr = await requireConfig()
    // 零点签到
    if (nowHours == 23 && nowMinutes > 55) {
        if (control.qd === "on") {
            //执行第一步，店铺签到
            console.log(`即将零点，执行等待计时`)
            //等到0点0分20秒
            $.zerotime = await yxl.zerotime($.delay * 1000)
            if ($.zerotime < 120000) {
                console.log(`还未到零点，等待${$.zerotime / 1000}秒......`);
                await $.wait($.zerotime)
            }
            console.log('零点店铺签到间隔:', interval + '秒!')
            await firststep();
            await yxl[$.changeplan ? 'count1' : 'count'](TK_SIGN.id, TK_SIGN.sign, 'requesttimes')
        }
        //其他时段签到                  
    } else {
        if (control.qd === "on") {
            await secondstep()
        }
    }
    //发送通知,0点不发送通知 
    if (message) {
        if (new Date().getHours() < 1) {
            console.log('现在' + new Date().getHours() + `点,默认不推送！`)
            if (notify_dpqd) {
                console.log(`你设置了推送，开始发送通知！`)
                await showMsg()
            }
        } else {
            await showMsg()
        }
    };
})()
    .catch((e) => {
        console.info('店铺签到（自动更新）error', e)
    })
    .finally(() => {
        $.done();
    })

//零点店铺签到
async function firststep() {
    //按用户顺序签到
    requesttimes++
    for (let [index, value] of cookiesArr.entries()) {
        try {
            $.UA = yxl.USER_AGENT
            cookie = value
            UserName = decodeURIComponent(cookie.match(/pt_pin=([^;]*)/)[1])
            console.log(`\n开始【账号${index + 1}】${UserName}\n`)
            message += `\n开始【账号${index + 1}】${UserName}\n`
            await dpqd()
            //await $.wait(100)
        } catch (e) {
            console.info('零点按用户顺序签到error', e)
        }
    }
}
//零点之后店铺签到
async function secondstep() {
    //按用户顺序签到
    for (let [index, value] of cookiesArr.entries()) {
        try {
            $.UA = yxl.USER_AGENT
            cookie = value
            UserName = decodeURIComponent(cookie.match(/pt_pin=([^;]*)/)[1])
            console.log(`\n开始【账号${index + 1}】${UserName}\n`)
            message += `\n开始【账号${index + 1}】${UserName}\n`
            await dpqd1()
            //await $.wait(100)
        } catch (e) {
            console.info('零点之后按用户顺序签到error', e)
        }
    }
}
//零点签到
async function dpqd() {
    for (var j = 0; j < token.length; j++) {
        if (new Date().getHours() < 1) {
            if (token[j].dday == 0) {
                //console.log('今日无奖励，其他时段再签！！！');
                continue
            }
        }

        await signCollectGift(token[j])
        await $.wait(interval * 1000)
        //if(j===3){await $.wait(30000)}
    }
}
//零点之后签到
async function dpqd1() {
    token.sort(function () { return Math.random() - 0.5 })
    for (var j = 0; j < token.length; j++) {
        logtemp = []

        logtemp.push(token[j].shopName + `:`)
        message += token[j].shopName + `:`
        await getvender(token[j].shopId)
        await signCollect(token[j].token, token[j].activity)
        await taskUrl(token[j].token, token[j].vender, token[j].activity)
        console.log(logtemp.join('→'))
        await $.wait(getRandomNumberByRange(interval1*1000, interval1*2000))
    }
}
//零点店铺签到
function signCollectGift(token) {
    return new Promise(resolve => {
        const options = {
            url: `${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_signCollectGift&body=%7B%22token%22%3A%22${token.token}%22%2C%22venderId%22%3A${token.vender}%2C%22activityId%22%3A${token.activity}%2C%22type%22%3A56%2C%22actionType%22%3A7%7D`,
            headers: {
                "accept": "accept",
                "accept-encoding": "gzip, deflate",
                "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "cookie": cookie,
                "referer": `https://h5.m.jd.com/babelDiy/Zeus/2PAAf74aG3D61qvfKUM5dxUssJQ9/index.html?token=${token}&sceneval=2&jxsid=16105853541009626903&cu=true&utm_source=kong&utm_medium=jingfen&utm_campaign=t_1001280291_&utm_term=fa3f8f38c56f44e2b4bfc2f37bce9713`,
                "User-Agent": $.UA
                // "User-Agent": `Mozilla/5.0 (Linux; U; Android 10; zh-cn; MI 8 Build/QKQ1.190828.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.147 Mobile Safari/537.36 XiaoMi/MiuiBrowser/13.5.40`
            }
        }
        //proxy(options)
        $.get(options, (err, resp, data) => {
            console.info('零点店铺签到', err, resp, data)
            try {
                if (err) {
                    console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
                    $.logErr(err);
                } else {
                    data = $.toObj(data, data)
                    console.info(`${$.name}: \n`, data)
                    switch (String(data.code)) {
                        case '200':
                            let info = sollectGift(data.data)
                            console.log(new Date().Format("hh:mm:ss.S"), `——(${data.code})同步√ ${token.shopName}${info}`);
                            message += `同步√ ${token.shopName}${info}\n`;
                            break;
                        case '-1':
                            console.log(new Date().Format("hh:mm:ss.S"), `——(${data.code})同步× ${token.shopName + cutlog(data.echo)}`);
                            message += `同步× ${token.shopName + cutlog(data.echo)} \n`;
                            break;
                        case '402':
                            console.log(new Date().Format("hh:mm:ss.S"), `——(${data.code})同步× ${token.shopName + cutlog(data.msg)}`);
                            message += `同步× ${token.shopName + cutlog(data.msg)} \n`;
                            break;
                        case '403030023':
                            console.log(new Date().Format("hh:mm:ss.S"), `——(${data.code})同步× ${token.shopName + cutlog(data.msg)}`);
                            message += `同步× ${token.shopName + cutlog(data.msg)} \n`;
                            break;
                        case '407000007':
                            console.log(new Date().Format("hh:mm:ss.S"), `——(${data.code})同步× ${token.shopName + cutlog(data.msg)}`);
                            message += `同步× ${token.shopName + cutlog(data.msg)} \n`;
                            break;
                        default:
                            console.log(new Date().Format("hh:mm:ss.S"), `——(${data.code})同步× ${token.shopName}${JSON.stringify(data)}`);
                            message += `同步× ${token.shopName} 未知错误，查看日志！\n`;
                    }
                }
            } catch (e) {
                console.info('零点店铺签到error', e)
            } finally {
                resolve(data);
            }
        })
    })
}
function sollectGift(data) {
    let info = ''
    let reward, discount, type, status
    for (let i = 0; i < data.length; i++) {
        data[i].level == 0 ? info += ":日签👉" : info += ":连签👉" + data[i].level + "天,"
        for (let j = 0; j < data[i].prizeList.length; j++) {
            discount = data[i].prizeList[j].discount
            type = data[i].prizeList[j].type
            status = data[i].prizeList[j].status
            if (status == 2) {
                type == 1 ? reward = '优惠券' : reward = reward
                type == 4 ? reward = '京豆' : reward = reward
                type == 6 ? reward = '积分' : reward = reward
                type == 9 ? reward = '满减券' : reward = reward
                type == 10 ? reward = 'e卡' : reward = reward
                type == 14 ? reward = '红包' : reward = reward
                info += discount + reward + ";"
            }
        }
    }
    return info
}
//打开首页
async function getvender(Id) {
    try {
        let { status } = await axios.get(`https://shop.m.jd.com/shop/home?shopId=${Id}`)
        //console.log(status)
        if (status === 200) {
            logtemp.push('逛店铺')
            message += '逛店铺;'
        } else {
            logtemp.push('IP黑名单')
            message += 'IP黑名单;'
        }
    } catch (e) {
        console.info('打开首页error', e)
    }
}
//零点之后店铺签到
function signCollect(token, activity) {
    return new Promise(resolve => {
        const options = {
            url: `${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_signCollectGift&body={%22token%22:%22${token}%22,%22venderId%22:688200,%22activityId%22:${activity},%22type%22:56,%22actionType%22:7}&jsonp=jsonp1004`,
            headers: {
                "accept": "accept",
                "accept-encoding": "gzip, deflate",
                "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "cookie": cookie,
                "referer": `https://h5.m.jd.com/babelDiy/Zeus/2PAAf74aG3D61qvfKUM5dxUssJQ9/index.html?token=${token}&sceneval=2&jxsid=16105853541009626903&cu=true&utm_source=kong&utm_medium=jingfen&utm_campaign=t_1001280291_&utm_term=fa3f8f38c56f44e2b4bfc2f37bce9713`,
                "User-Agent": $.UA
                // "User-Agent": `Mozilla/5.0 (Linux; U; Android 10; zh-cn; MI 8 Build/QKQ1.190828.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.147 Mobile Safari/537.36 XiaoMi/MiuiBrowser/13.5.40`
            }
        }
        //proxy(options)
        $.get(options, (err, resp, data) => {
            console.info('零点之后店铺签到', err, resp, data)
            try {
                if (err) {
                    console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
                    $.logErr(err);
                } else {
                    //console.log(data)
                    data = JSON.parse(/{(.*)}/g.exec(data)[0])
                    if (data.success) {
                        logtemp.push(`签到`)
                        message += `签到;`
                    } else {
                        logtemp.push(cutlog(data.msg))
                        message += cutlog(data.msg)
                    }
                }
            } catch (e) {
                console.info('零点之后店铺签到', e)
            } finally {
                resolve(data);
            }
        })
    })
}
//店铺获取签到信息
function taskUrl(token, venderId, activityId) {
    return new Promise(resolve => {
        const options = {
            url: `${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_getSignRecord&body={%22token%22:%22${token}%22,%22venderId%22:${venderId},%22activityId%22:${activityId},%22type%22:56}&jsonp=jsonp1006`,
            headers: {
                "accept": "application/json",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "zh-CN,zh;q=0.9",
                "cookie": cookie,
                "referer": `https://h5.m.jd.com/`,
                "User-Agent": $.UA
                // "user-agent": `Mozilla/5.0 (Linux; U; Android 10; zh-cn; MI 8 Build/QKQ1.190828.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.147 Mobile Safari/537.36 XiaoMi/MiuiBrowser/13.5.40`
            }
        }
        $.get(options, (err, resp, data) => {
            console.info('店铺获取签到信息', err, resp, data)
            try {
                if (err) {
                    console.log(`\n${$.name}: API查询请求失败 ‼️‼️`)
                    $.logErr(err);
                } else {
                    //console.log(data)
                    data = JSON.parse(/{(.*)}/g.exec(data)[0])
                    if (data.code === 200) {
                        logtemp.push('第' + data.data.days + '天。')
                        message += `第` + data.data.days + `天。\n`
                    }
                }
            } catch (e) {
                console.info('店铺获取签到信息', e)
            } finally {
                resolve(data);
            }
        })
    })
}

async function requireConfig(check = false) {
    let cookiesArr = []
    const jdCookieNode = require('./jdCookie.js')
    let keys = Object.keys(jdCookieNode)
    for (let i = 0; i < keys.length; i++) {
        let cookie = jdCookieNode[keys[i]]
        if (!check) {
            cookiesArr.push(cookie)
        } else {
            if (await checkCookie(cookie)) {
                cookiesArr.push(cookie)
            } else {
                console.log('Cookie失效', username)
                await sendNotify('Cookie失效', '【京东账号】')
            }
        }
    }
    console.log(`共${cookiesArr.length}个京东账号\n`)
    return cookiesArr
}
function getRandomNumberByRange(start, end) {
    return Math.floor(Math.random() * (end - start) + start)
}
// 以上都是抄来的，我也不知道干啥用的，不要瞎改就对了

//定义通知函数
async function showMsg() {
    if ($.isNode()) {
        $.msg($.name, '', `${message}`);
        await notify.sendNotify(`${$.name}`, `${message}`);
    }
}
//精简log
function cutlog(log) {
    if (log) {
        log = log.replace("对不起，你已经参加过该活动啦，去看看别的吧", " 已签");
        log = log.replace("当前不存在有效的活动", " 被撸空了");
    }
    return log
}
