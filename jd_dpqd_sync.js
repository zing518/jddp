/**
 * cron: 29,59 22,23 * * *
 * 用户分两组，用户vip1和vip2数据
 * 用户可签到数量的一半和10取最小值使用第一组数据，剩下的使用第二组数据。
 * 需设置使用第一组数据的pin名单
 * export TK_SIGN_VIP=pin1&pin2&pin3（最多10个）
 * ************************
 * 增加变量TK_SIGN_WAIT，控制零点店铺签到间隔，单位是秒，不是毫秒。默认是1s。
 * 定时不要增加，单日请求次数用完你就获取不到数据了。青龙配置文件随机延迟取消即RandomDelay=""。
 * 想跑几个号自己在定时任务命令后面加限制,如何限制去百度，问我也不知道，脚本内部不做限制。
 * 默认不推送通知，可以添加环境变量NOTIFY_DPQD为true开启，能不能签到豆查询就好了，签到通知与否没关系。
 * 环境变量名称：TK_SIGN，环境变量值：{"id":*,"sign":"************************"}
 * 用上面的环境变量报读取出错则拆分为TK_SIGN_ID和TK_SIGN_SIGN两个变量，对应上面｛｝里的两个值，若不报错则忽略此行。
*/


const $ = new Env('店铺签到（分组+内部并发）');

if (!process.env.TK_SIGN_NEW) {
    console.log("☢️设置TK_SIGN_NEW=true启用新脚本，必须停下旧脚本！");
    return;
}
const request = require('request')
const notify = require("./sendNotify");
const axios = require("axios");
const yxl = require("./depend/yxl");
const tunnel = require("tunnel");
const JD_API_HOST = "https://api.m.jd.com/api?appid=interCenter_shopSign";

//创建缓存目录cacheFile
const cacheDir = "./cache";
const aesCrypto = require("crypto-js/aes");
const utf8Encode = require("crypto-js/enc-utf8");

let user_dpqd_info = {};
let nowHours = new Date().getHours();
let nowMinutes = new Date().getMinutes();
let cookiesArr = [];
let token = { vip1: [], vip2: [] };
let logtemp = {};
let message = "";
let notify_dpqd = false;

let user_dpqd_vip = [];
let retrytimes = process.env.TK_SIGN_RT || 2;
let usernum = 1;
let user_dpqd_cache = {};
let interval1 = 10;
let delay = 0.1
let PROXY_HOST = process.env.Proxy_ip;
let PROXY_PORT = process.env.Proxy_http_port;

let TK_SIGN_ID = '';
let TK_SIGN_SIGN = '';
let TK_SIGN = {};

if (process.env.TK_SIGN_ID) {
    TK_SIGN_ID = process.env.TK_SIGN_ID || "";
    TK_SIGN_SIGN = process.env.TK_SIGN_SIGN || "";
    TK_SIGN = { id: TK_SIGN_ID, sign: TK_SIGN_SIGN };
} else if (process.env.TK_SIGN) {
    TK_SIGN = process.env.TK_SIGN;
    TK_SIGN = $.toObj(TK_SIGN, TK_SIGN);
} else {
    console.log("☢️@LTQDTZbot发送 /register 查询|获取TK_SIGN。");
}

if (process.env.TK_SIGN_VIP) {
    user_dpqd_vip = process.env.TK_SIGN_VIP.split("&");
    if (user_dpqd_vip.length > 10) {
        console.log("        ☢️\n      ☢️☢️\n    ☢️☢️☢️\n  ☢️☢️☢️☢️\n☢️☢️☢️☢️☢️\n☢️☢️☢️☢️☢️☢️\n☢️☢️☢️☢️☢️☢️☢️\n☢️☢️☢️☢️☢️☢️☢️☢️\n你是vip中p吗？");
        return;
    }
} else {
    console.log("☢️你未设置export TK_SIGN_VIP=pin1&pin2&pin3（最多10个），默前10个pin作为vip！优先使用变量！");
}

if (process.env.TK_SIGN_WAIT && process.env.TK_SIGN_WAIT < 5) {
    interval = process.env.TK_SIGN_WAIT;
}

if (process.env.TK_SIGN_WAIT1 && process.env.TK_SIGN_WAIT1 < 10) {
    interval1 = process.env.TK_SIGN_WAIT1;
}
//凌晨签到是否通知，变量设置true则通知，默认不通知，估计影响签到网速，未验证。22点签到通知结果。
if (process.env.NOTIFY_DPQD) {
    notify_dpqd = process.env.NOTIFY_DPQD;
}

if (process.env.TK_SIGN_delay) {
    delay = process.env.TK_SIGN_delay;
}

if (1) {
    console.debug = () => { };
}
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

!(async () => {
    console.log("🔔当前ID号", TK_SIGN.id);
    console.log("🔔当前版本号", "20231117");
    let apidata = ''
    // 获取缓存数据apidata
    apidata = await ReadCache("dpqd", "apidata", $.time("MM_dd", Date.now() - 24 * 60 * 60000));
    if (!apidata) {
        apidata = await ReadCache("dpqd", "apidata", $.time("MM_dd"));
    };


    user_dpqd_cache = (await ReadCache("dpqd", "user_dpqd_cache", $.time("MM_dd"))) || {};
    console.debug($.time("hh:mm:ss---->"), "user_dpqd_cache\n" + JSON.stringify(user_dpqd_cache));

    // 获取缓存数据
    if (user_dpqd_vip.length < 1) {
        user_dpqd_vip = await ReadCache("dpqd", "user_dpqd_vip");
        console.debug($.time("hh:mm:ss---->"), "user_dpqd_vip\n" + user_dpqd_vip);
    }
    // 解密
    apidata = await decrypt(apidata.cachedata, apidata.update_time + __dirname.slice(-18));
    console.debug($.time("hh:mm:ss---->"), "apidata\n", apidata);
    apidata = $.toObj(apidata, apidata);
    if (typeof apidata != "object") {
        console.log($.time("hh:mm:ss---->"), "======apidata 数据格式错误======\n" + typeof apidata);
        return;
    }


    let emergency = apidata.notify;
    if (nowHours < 23 && emergency !== "null") {
        console.log(new Date().Format("hh:mm:ss---->"), "\n====================通知====================\n" + emergency,
        );
        message += "\n======通知======\n" + emergency + "\n";
    }
    // 获取控制参数
    let control = apidata.control;
    control = $.toObj(control, control);
    if (control.qd === "off") {
        console.log(new Date().Format("hh:mm:ss---->"), "\n店铺签到暂停！！");
    }
    // 获取签到usernum
    usernum = apidata.usernum * 1 || 1;
    // 获取签到token
    let dpqd_info = decodeURIComponent(apidata.dpqd_info);
    console.debug(new Date().Format("hh:mm:ss---->"), "dpqd_info\n" + JSON.stringify(dpqd_info));
    dpqd_info = $.toObj(dpqd_info, dpqd_info);
    // 解密
    dpqd_info = await decrypt(dpqd_info.dpqd_info, dpqd_info.update_time + __dirname.slice(-18));
    dpqd_info = $.toObj(dpqd_info, dpqd_info);
    console.debug(new Date().Format("hh:mm:ss---->"), "dpqd_info\n" + JSON.stringify(dpqd_info));

    if (typeof dpqd_info != "object") {
        console.log(new Date().Format("hh:mm:ss---->"), "======dpqd_info数据格式错误======\n" + typeof dpqd_info);
        return;
    }
    // 读取cookiesArr,获取前十个pin缓存
    cookiesArr = await requireConfig();
    if (user_dpqd_vip.length === 0) {
        for (let [index, value] of cookiesArr.entries()) {
            if (index + 1 > Math.max(usernum / 2, 10)) {
                console.log(new Date().Format("hh:mm:ss---->"), `\n获取vip用户结束，将作为缓存保存本地，建议设置vip变量！！\n`);
                break;
            }
            let UserName = decodeURIComponent(value.match(/pt_pin=([^;]*)/)[1]);
            user_dpqd_vip.push(UserName);
        }
        await WriteCache(user_dpqd_vip, "dpqd", "user_dpqd_vip");
        console.log(new Date().Format("hh:mm:ss---->"), `\n缓存vip用户：\nexport TK_SIGN_VIP=` + user_dpqd_vip.join("&"));
    }
    console.log(new Date().Format("hh:mm:ss---->"), `vip用户：\n` + user_dpqd_vip);

    if (control.qd === "on") {
        // 零点签到
        if (nowHours == 23 && nowMinutes > 55) {
            Object.keys(dpqd_info).forEach((item) => {
                for (var j = 0; j < dpqd_info[item].length; j++) {
                    if (dpqd_info[item][j].dday == 1) {
                        token[item].push(dpqd_info[item][j]);
                    }
                }
            });

            if (token.vip1.length + token.vip2.length > 0) {
                console.log(new Date().Format("hh:mm:ss---->"), `vip1：${token.vip1.length}个，vip2：${token.vip2.length}个！`);
                message += `vip1：${token.vip1.length}个，vip2：${token.vip2.length}个！\n`;
                await dpqd(0);

            } else {
                console.log(new Date().Format("hh:mm:ss---->"), `今日零点无奖励！`);
                message += `今日零点无奖励！\n`;
            }
            await $.wait(60000);
        } else {
            //其他时段签到
            token = dpqd_info
            console.log(new Date().Format("hh:mm:ss---->"), `其他时段签到`);
            await dpqd(1);
            console.info = () => { };
        }
    }



    console.debug(new Date().Format("hh:mm:ss---->"), logtemp);

    Object.keys(logtemp).forEach((item1) => {
        console.info("\n\n📣" + item1 + "：");
        message += "\n\n📣" + item1 + "：\n";
        Object.keys(logtemp[item1]).forEach((item2) => {
            console.info("  🛒->" + item2);
            message += "\n  🛒->" + item2 + "\n    ";
            for (var j = 0; j < logtemp[item1][item2].length; j++) {
                console.info("    " + logtemp[item1][item2][j].time + "----" + logtemp[item1][item2][j].result);
                message += " -->" + logtemp[item1][item2][j].result;
            }
        });
    });

    //缓存到本地
    await WriteCache(user_dpqd_cache, "dpqd", "user_dpqd_cache", new Date().Format("MM_dd"));
    //发送通知,0点不发送通知
    if (message) {
        if (new Date().getHours() < 1) {
            console.log(new Date().Format("hh:mm:ss---->"), "现在" + new Date().getHours() + `点,默认不推送！`);
            if (notify_dpqd) {
                console.log(new Date().Format("hh:mm:ss---->"), `你设置了推送，开始发送通知！`);
                await showMsg();
            }
        } else {
            await showMsg();
        }
    }
})()
    .catch((e) => {
        console.debug(new Date().Format("hh:mm:ss---->"), e);
    })
    .finally(() => {
        $.done();
    });

//店铺签到
async function dpqd(t) {
    //按用户顺序签到
    for (let [index, value] of cookiesArr.entries()) {
        if (index + 1 > usernum) {
            console.log(new Date().Format("hh:mm:ss---->"), `\n去给作者提供更多的助力吧！！\n`);
            break;
        }

        let UserName = decodeURIComponent(value.match(/pt_pin=([^;]*)/)[1]);

        if (!user_dpqd_cache[UserName]) {
            user_dpqd_cache[UserName] = {};
        }
        logtemp[UserName] = {};
        user_dpqd_info[UserName] = {};

        user_dpqd_info[UserName]["user"] = UserName;
        user_dpqd_info[UserName]["ua"] = yxl.getua();
        user_dpqd_info[UserName]["ck"] = value;

        console.debug(new Date().Format("hh:mm:ss---->"), `vip1数据：${JSON.stringify(token.vip1)}`);
        console.debug(new Date().Format("hh:mm:ss---->"), `vip2数据：${JSON.stringify(token.vip2)}`);
        if (user_dpqd_vip.includes(UserName)) {
            user_dpqd_info[UserName]["tk"] = token.vip1;
            console.log(new Date().Format("hh:mm:ss---->"), `使用车头数据！`);
        } else {
            user_dpqd_info[UserName]["tk"] = token.vip2;
            console.log(new Date().Format("hh:mm:ss---->"), `使用韭菜数据！`);
        };
        console.debug(new Date().Format("hh:mm:ss---->"), `使用数据：${JSON.stringify(user_dpqd_info[UserName]["tk"])}`);
        await $.wait(1000);
        if (t == 0) {
            //console.log(`\n******【账号${index + 1}】${UserName}准备******\n`);
            dpqd_async(user_dpqd_info[UserName]);
        } else {
            console.log(`\n******【账号${index + 1}】${UserName}开始签到******\n`);
            await dpqd_sync(user_dpqd_info[UserName]);
        };
    };
}

//零点签到
async function dpqd_async(userinfo) {
    for (var i = 0; i < userinfo.tk.length; i++) {
        logtemp[userinfo.user][userinfo.tk[i].shopName] = [];
        user_dpqd_cache[userinfo.user][userinfo.tk[i].shopName] = false;
        sign_async(userinfo, userinfo.tk[i]);
        await $.wait(100);
    }
}
//零点店铺签到，异步函数
async function jsign_async(userinfo, tokeninfo, useProxy = false) {
    //console.log(yxl.GetDateTime(new Date())+'开始验证vid')
    let proxy = ''
    if (useProxy) {
        proxy = `http://${PROXY_HOST}:${PROXY_PORT}`
    }

    let bodyin = {
        token: "" + tokeninfo.token,
        venderId: tokeninfo.vender,
        activityId: tokeninfo.activity,
        type: 56,
        actionType: 7,
    };
    let cl = "ios"
    if (userinfo.ua.split(";")[1] === "android") {
        cl = "android";
    };
    let body = {
        appId: "4da33",
        fn: "interact_center_shopSign_signCollectGift",
        body: bodyin,
        apid: "interCenter_shopSign",
        ver: userinfo.ua.split(";")[2],
        cl: cl,
        user: userinfo.user,
        code: 1,
        ua: userinfo.ua,
    };
    bodyin = await yxl.getbody(body);
    //等到0点0分
    await waitfor(delay * 1000);

    request({
        method: 'GET',   //请求方式
        timeout: 5000,
        url: "https://api.m.jd.com/api?loginType=2&" + bodyin,
        gzip: true,
        proxy: proxy,
        rejectUnauthorized: false,
        headers: {
            accept: "accept",
            "accept-encoding": "gzip, deflate",
            "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
            cookie: userinfo.ck,
            referer: "https://h5.m.jd.com/babelDiy/Zeus/2PAAf74aG3D61qvfKUM5dxUssJQ9/index.html?token=" + tokeninfo.token + "&sceneval=2",
            "User-Agent": userinfo.ua,
        },
    }, async function (error, response, body) {
        if (!error) {
            data = JSON.parse(/{(.*)}/g.exec(body)[0])
            if (data.success) {
                console.log(new Date().Format("hh:mm:ss.S") + `-->${userinfo.user}--> ${tokeninfo.shopName}--> ${sollectGift(data.data)}`);
                message += `${userinfo.user}--> ${tokeninfo.shopName}--> ${sollectGift(data.data)}\n`
            } else {
                await signCollectGift(userinfo, tokeninfo, useProxy);
                if (data.msg) {
                    console.log(new Date().Format("hh:mm:ss.S") + `-->${userinfo.user}--> ${tokeninfo.shopName}--> ${cutlog(data.msg)}`);
                } else {
                    console.log(new Date().Format("hh:mm:ss.S") + `-->${userinfo.user}--> ${tokeninfo.shopName}--> `, data);
                }
            }
        } else {
            await signCollectGift(userinfo, tokeninfo, useProxy);
            console.log(`\n${$.name}: API1查询请求失败 ‼️‼️`)
            $.logErr(error);
        }
    });
}
//零点签到
async function sign_async(userinfo, tokeninfo) {
    //等到0点0分
    await waitfor(delay * 1000);
    for (let retry = 0; retry < retrytimes; retry++) {
        let useProxy = retry % 2;
        let data = await signCollectGift(userinfo, tokeninfo, useProxy);
        if (data) {
            if (data.success && data.success === true) {
                console.log(new Date().Format("hh:mm:ss---->"), `${userinfo.user}->${tokeninfo.shopName}->${sollectGift(data.data)}`);
                logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: sollectGift(data.data) });
                user_dpqd_cache[userinfo.user][tokeninfo.shopName] = true;
                break;
            } else {
                if (data.msg) {
                    console.log(new Date().Format("hh:mm:ss---->"), `${userinfo.user}->${tokeninfo.shopName}->${data.msg}`);
                    if (!data.msg.match(/(?=签到异常|查看日志)/)) {
                        logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: '签到异常，查看日志！' });
                    }
                } else {
                    console.log(new Date().Format("hh:mm:ss---->"), `${userinfo.user}->${tokeninfo.shopName}->${JSON.stringify(data)}`);
                }

                if (retry > 0 && data.msg && data.msg.match(/(?=已经参加过该活动|不存在有效的活动)/)) {
                    break;
                }
                await $.wait(100);
            }

            if (data.msg) {
                if (!data.msg.match(/(?=签到异常|查看日志)/)) {
                    logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: '签到异常，查看日志！' });
                }
            }
        } else {
            if (!data.msg.match(/(?=京东返回数据为空)/)) {
                logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: '京东返回数据为空！' });
            }
            console.log(new Date().Format("hh:mm:ss---->"), `${userinfo.user}->${tokeninfo.shopName}->京东返回数据为空！`);
        }
    }
}

//零点之后签到
async function dpqd_sync(userinfo) {
    console.debug(new Date().Format("hh:mm:ss---->"), userinfo.tk);
    for (var i = 0; i < userinfo.tk.length; i++) {
        logtemp[userinfo.user][userinfo.tk[i].shopName] = [];
        console.debug(new Date().Format("hh:mm:ss---->"), user_dpqd_cache[userinfo.user][userinfo.tk[i].shopName]);

        if (!user_dpqd_cache[userinfo.user][userinfo.tk[i].shopName]) {
            user_dpqd_cache[userinfo.user][userinfo.tk[i].shopName] = false;
        };
    }
    let tokentemp = userinfo.tk;
    tokentemp.sort(function () {
        return Math.random() - 0.5;
    });

    for (var j = 0; j < tokentemp.length; j++) {
        console.log("🛒->", tokentemp[j].shopName);
        console.debug(new Date().Format("hh:mm:ss---->"), user_dpqd_cache[userinfo.user][tokentemp[j].shopName]);
        if (user_dpqd_cache[userinfo.user][tokentemp[j].shopName]) {
            console.log(new Date().Format("hh:mm:ss---->"), "已签到！");
            logtemp[userinfo.user][tokentemp[j].shopName].push({ time: new Date().Format("hh:mm:ss"), result: "已签到！" });
            continue;
        }
        await getvender(userinfo, tokentemp[j]);
        await sign_sync(userinfo, tokentemp[j]);
        await taskUrl(userinfo, tokentemp[j]);

        await $.wait(getRandomNumberByRange(interval1 * 1000, interval1 * 2000));
    }
}
//打开首页
async function getvender(userinfo, tokeninfo) {
    try {
        let { status } = await axios.get(
            `https://shop.m.jd.com/shop/home?shopId=${tokeninfo.vender}`,
        );
        //console.log(new Date().Format("hh:mm:ss---->"), status)
        if (status === 200) {
            logtemp[userinfo.user][tokeninfo.shopName].push({
                time: new Date().Format("hh:mm:ss.S"),
                result: "逛店铺",
            });

            console.log(new Date().Format("hh:mm:ss---->"), "去浏览店铺!");
        } else {
            logtemp[userinfo.user][tokeninfo.shopName].push({
                time: new Date().Format("hh:mm:ss.S"),
                result: "IP黑名单;",
            });
            console.log(new Date().Format("hh:mm:ss---->"), "你吃了闭门羹，这家店铺不欢迎您！");
        }
    } catch (e) {
        logtemp[userinfo.user][tokeninfo.shopName].push({
            time: new Date().Format("hh:mm:ss.S"),
            result: "打开首页error",
        });
    }
}
//零点之后签到
async function sign_sync(userinfo, tokeninfo) {
    let data = await signCollectGift(userinfo, tokeninfo);
    if (data) {
        if (data.success && data.success === true) {
            logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: `签到成功!` });
            user_dpqd_cache[userinfo.user][tokeninfo.shopName] = true;
            console.log(new Date().Format("hh:mm:ss---->"), `签到成功!`);
        } else {
            if (data.msg) {
                logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: cutlog(data.msg) });
                if (data.msg.match(/(?=已经参加过该活动|不存在有效的活动)/)) {
                    user_dpqd_cache[userinfo.user][tokeninfo.shopName] = true;
                }
                console.log(new Date().Format("hh:mm:ss---->"), cutlog(data.msg));
            } else {
                logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: '签到异常，查看日志！' });
                console.log(new Date().Format("hh:mm:ss---->"), JSON.stringify(data));
            }
        }
    } else {
        console.log(new Date().Format("hh:mm:ss---->"), `${userinfo.user}->${tokeninfo.shopName}->京东返回数据为空！`);
    }
}

//获取店铺签到信息
function taskUrl(userinfo, tokeninfo) {
    return new Promise((resolve) => {
        const options = {
            url: `${JD_API_HOST}&t=${Date.now()}&loginType=2&functionId=interact_center_shopSign_getSignRecord&body={%22token%22:%22${tokeninfo.token}%22,%22venderId%22:${tokeninfo.vender},%22activityId%22:${tokeninfo.activity},%22type%22:56}&jsonp=jsonp1006`,
            headers: {
                accept: "application/json",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "zh-CN,zh;q=0.9",
                cookie: userinfo.ck,
                referer: `https://h5.m.jd.com/`,
                "User-Agent": userinfo.ua
            },
        };
        $.get(options, (err, resp, data) => {
            try {
                if (err) {
                    logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: '获取店铺签到信息失败！' });
                    console.log(new Date().Format("hh:mm:ss---->"), err);
                } else {
                    data = JSON.parse(/{(.*)}/g.exec(data)[0]);
                    if (data.code === 200) {
                        logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: "第" + data.data.days + "天。" });
                        console.log(new Date().Format("hh:mm:ss---->"), "第" + data.data.days + "天签到。");
                    } else {
                        console.log(new Date().Format("hh:mm:ss---->"), "获取店铺签到信息", data);
                    }
                }
            } catch (e) {
                console.log(new Date().Format("hh:mm:ss---->"), "获取店铺签到信息", e, resp);
                logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: '获取店铺签到信息失败！' });
            } finally {
                resolve(data);
            }
        });
    });
}

async function signCollectGift(userinfo, tokeninfo, useProxy) {
    let bodyin = {
        token: "" + tokeninfo.token,
        venderId: tokeninfo.vender,
        activityId: tokeninfo.activity,
        type: 56,
        actionType: 7,
    };
    let cl = "ios"
    if (userinfo.ua.split(";")[1] === "android") {
        cl = "android";
    };
    let body = {
        appId: "4da33",
        fn: "interact_center_shopSign_signCollectGift",
        body: bodyin,
        apid: "interCenter_shopSign",
        ver: userinfo.ua.split(";")[2],
        cl: cl,
        user: userinfo.user,
        code: 1,
        ua: userinfo.ua,
    };
    return (
        (bodyin = await yxl.getbody(body)),
        new Promise((resolve) => {
            let options = {
                url: "https://api.m.jd.com/api?loginType=2&" + bodyin,
                headers: {
                    accept: "accept",
                    "accept-encoding": "gzip, deflate",
                    "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                    cookie: userinfo.ck,
                    referer: "https://h5.m.jd.com/babelDiy/Zeus/2PAAf74aG3D61qvfKUM5dxUssJQ9/index.html?token=" + tokeninfo.token + "&sceneval=2",
                    "User-Agent": userinfo.ua,
                },
            };

            if (useProxy) {
                const agent = {
                    https: tunnel.httpsOverHttp({
                        proxy: {
                            host: PROXY_HOST,
                            port: PROXY_PORT * 1,
                        },
                    }),
                };
                Object.assign(options, { agent });
            }

            $.get(options, async (err, resp, data) => {

                try {
                    if (err) {
                        console.log(new Date().Format("hh:mm:ss---->"), `signCollectGift:${userinfo.user}->${tokeninfo.shopName}-err>${JSON.stringify(err)}`);
                        logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: '签到失败！' });
                    } else {
                        console.debug(new Date().Format("hh:mm:ss---->"), `${userinfo.user}->${tokeninfo.shopName}-data>${JSON.stringify(data)}`);
                        data = JSON.parse(data);
                    }
                } catch (e) {
                    console.log(new Date().Format("hh:mm:ss---->"), `signCollectGift:${userinfo.user}->${tokeninfo.shopName}-err>${JSON.stringify(e)}`);
                    logtemp[userinfo.user][tokeninfo.shopName].push({ time: new Date().Format("hh:mm:ss.S"), result: '签到失败！' });
                } finally {
                    resolve(data);
                };
            });
        })
    );
}

async function requireConfig(check = false) {
    let cookiesArr = [];
    const jdCookieNode = require("./jdCookie.js");
    let keys = Object.keys(jdCookieNode);
    for (let i = 0; i < keys.length; i++) {
        let cookie = jdCookieNode[keys[i]];
        if (!check) {
            cookiesArr.push(cookie);
        } else {
            if (await checkCookie(cookie)) {
                cookiesArr.push(cookie);
            } else {
                console.log(new Date().Format("hh:mm:ss---->"), "Cookie失效", username);
                await sendNotify("Cookie失效", "【京东账号】");
            }
        }
    }
    console.log(new Date().Format("hh:mm:ss---->"), `共${cookiesArr.length}个京东账号\n`);
    return cookiesArr;
}
function getRandomNumberByRange(start, end) {
    return Math.floor(Math.random() * (end - start) + start);
}
// 以上都是抄来的，我也不知道干啥用的，不要瞎改就对了

//定义通知函数
async function showMsg() {
    if ($.isNode()) {
        $.msg($.name, "", `${message}`);
        await notify.sendNotify(`${$.name}`, `${message}`);
    }
}
//精简log
function cutlog(log) {
    if (log) {
        log = log.replace("对不起，你已经参加过该活动啦，去看看别的吧", "已签到");
        log = log.replace("当前不存在有效的活动", "被撸空了");
    }
    return log;
}

function sollectGift(data) {
    let info = "";
    let reward, discount, type, status;
    for (let i = 0; i < data.length; i++) {
        if (data[i].level == 0) {
            (info += ":日签👉")
        }
        else {
            info += ":连签👉" + data[i].level + "天,";
        }
        for (let j = 0; j < data[i].prizeList.length; j++) {
            discount = data[i].prizeList[j].discount;
            type = data[i].prizeList[j].type;
            status = data[i].prizeList[j].status;
            if (status == 2) {
                if (type == 1) { (reward = "优惠券") };
                if (type == 4) { (reward = "京豆") };
                if (type == 6) { (reward = "积分") };
                if (type == 9) { (reward = "满减券") };
                if (type == 10) { (reward = "e卡") };
                if (type == 14) { (reward = "红包") };

                info += discount + reward + ";";
            };
        };
    };
    return info;
}
//定义等待函数，如果当前分钟数大于58，则等待设定秒数
async function waitfor(delay) {
    // 现在与明天0:0:0时间戳时差ms
    const sleeptime = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000 + (24 * 60 * 60 * 1000) - Date.now() - delay
    if (sleeptime < 60000) {
        console.log(new Date().Format("hh:mm:ss---->"), `需等待约${sleeptime / 1000}s开始签到...`);
        await $.wait(sleeptime)
    } else {
        console.log(new Date().Format("hh:mm:ss---->"), `马上开始签到...`);
    }
}
//写入缓存
async function WriteCache(data, jsname, name1, name2) {
    //(name1, data, name2 = time("MM_dd"), address = '')
    if (jsname) {
        $.dataFile = cacheDir + "/" + jsname + ".json"
    };
    let box_dat = {};
    if (!name2) {
        box_dat = data;
    } else {
        box_dat[name2] = data;
    };
    $.setdata(box_dat, name1);
}
// 读取缓存
async function ReadCache(jsname, name1, name2) {
    //、读取box.dat数据中对应name数据
    if (jsname) {
        $.dataFile = cacheDir + "/" + jsname + ".json"
    };
    let name1_info = $.getdata(name1) || "";
    name1_info = $.toObj(name1_info, name1_info);

    //、获取box.dat中今日数据，name2_info = {'greenwave1987':{'code':'','state':0|1|2}},
    if (!name2) {
        return name1_info;
    } else {
        if (typeof name1_info != "object") {
            name1_info = {};
        };
        let name2_info = "";
        if (name1_info[name2]) {
            name2_info = name1_info[name2];
        };
        name2_info = $.toObj(name2_info, name2_info);
        if (typeof name1_info != "object") {
            name2_info = "";
        };
        return name2_info;
    }
}
// 解密
async function decrypt(t, s) {
    let decryptText = aesCrypto.decrypt(t, s).toString(utf8Encode);
    return decryptText.toString(utf8Encode);
}


function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
