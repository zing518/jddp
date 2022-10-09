/**
 * cron: 0 0,1,6 * * *
*/

console.log('当前版本号','20221009-v1.0')
console.log('若脚本报错则增加变量TK_SIGN_method为b再试一次，还不行就用旧脚本！')
const yxl = require('./yxl')
const $ = new yxl.Env('挖宝助力（店铺签到专用）');
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : ''
const notify = $.isNode() ? require('./sendNotify') : ''
const linkId = 'pTTvJeSTrpthgk9ASBVGsw'
const axios = require('axios')

if(process.env.TK_SIGN_method&&process.env.TK_SIGN_method=='planb'){
    $.changeplan=true
}else{
    $.changeplan=false
}
let whitelist = '' // 白名单 用&隔开 pin值(填中文
let blacklist = '' // 黑名单 用&隔开 pin值(填中文
let nowHours = new Date().getHours(),
    fcwb = [],
    codestemp='',
    apidata,
    PROXY_HOST ='',
    PROXY_PORT ='',
    wbh5st='',
    cookiesArr = [],
    
    helpToolsArr = [],
    helpCookiesArr = [],
    available='',
    sendFlag = true,
    allMessage = '',
    message = '',
    timeDelayG=300000,
    timeDelayN=300000

if(process.env.TK_SIGN_ID){
    $.TK_SIGN_ID=process.env.TK_SIGN_ID||''
    $.TK_SIGN_SIGN=process.env.TK_SIGN_SIGN||''
    $.TK_SIGN ={id:$.TK_SIGN_ID,sign:$.TK_SIGN_SIGN}
}else if(process.env.TK_SIGN){
    $.TK_SIGN=process.env.TK_SIGN
    $.TK_SIGN=$.toObj($.TK_SIGN,$.TK_SIGN)
}else {
    console.log('联系@dpqd_boss获取TK_SIGN.')
}

if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
} else {
    cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || '[]').map(item => item.cookie)].filter(item => !!item)
}

$.dpqd_help_list = $.getdata("dpqd_help_list") || {}
$.dpqd_help_list = $.toObj($.dpqd_help_list,$.dpqd_help_list)
if(typeof $.dpqd_help_list != "object"){
    $.dpqd_help_list = {}
}
$.dpqd_help = {}
if($.dpqd_help_list[$.time("MM_dd")]){
    $.dpqd_help = $.dpqd_help_list[$.time("MM_dd")]
}

$.toStatus = false
$.jdStatus = true
$.hotFlag = false
$.errMsgPin = []
$.totalhelptimes=0
$.successhelptimes=0
$.PROXY_LIST=[]

!(async () => {
    console.log(typeof $.TK_SIGN.id,`TK_SIGN.id:${$.toStr($.TK_SIGN.id)}`);
    //验证服务器连接耗时
    if(new Date().getHours()>21){
        console.log('数据都清空了，别跑了！等零点再跑！')
        return
    }
    await $.wait(yxl.randomNumber(1000, 5000))
    $.apidata = await yxl[$.changeplan?'readapi1':'readapi']('TOKEN',$.TK_SIGN.id,$.TK_SIGN.sign)

    $.apidata=$.toObj($.apidata,$.apidata)
    if(typeof $.apidata != "object"){
        $.apidata = []
        return
    }
    if ($.apidata.debug== '') console.debug = () => {}
    await ping()
    //等到0点0分20秒$.apidata.begain值为开始秒数
    if(new Date().getHours()==0){
        $.zerotime=await yxl.zerotime($.apidata.begain*1000) //单位毫秒
        if($.zerotime<120000){
            console.log(`还未获取到助力码，等待${$.zerotime/1000}秒......`);
            await $.wait($.zerotime)
        }
    }
    // 验证是否获取到助力码 
    for(let i=1;i<7;i++){
        new Date().getHours()==0||i>1?$.apidata = await yxl[$.changeplan?'readapi1':'readapi']('TOKEN',$.TK_SIGN.id,$.TK_SIGN.sign):''
        $.apidata = $.toObj($.apidata,$.apidata)
        if(typeof $.apidata != "object"){
            continue
        }
        $.fcwb = $.apidata.fcwb
        $.fcwb=$.toObj($.fcwb,$.fcwb)
        console.debug(`获取到fcwb:\n${$.toStr($.fcwb)}`);
        $.PROXY_LIST = $.apidata.plist
        $.PROXY_LIST=$.toObj($.PROXY_LIST,$.PROXY_LIST)
        console.debug(`获取到PROXY_LIST:\n${$.toStr($.PROXY_LIST)}`);
        if ($.fcwb.length === 0) {
            console.log(`还未获取到助力码，${i===6?600:i*5}s后继续`);
            await $.wait(i===6?600000:i*5000)   
        }else{
            console.log('获取到助力码，可以继续下一步！')
            break
        }
        i==6?console.log('最终无法获取到助力码，退出！'):''
    }
    if ($.fcwb.length === 0) {;
        return
    }
/** 获取凭证
    $.nolantokenary=$.apidata.nolantoken
    $.nolantokenary=$.toObj($.nolantokenary,$.nolantokenary)
    $.nolantoken=process.env.TK_nolan_token||$.TK_SIGN.id<50?$.nolantokenary[0]:$.nolantokenary[1]
    $.nolantoken=$.nolantoken.replace(/\\/gi,"");
    console.debug(`使用nolantoken:\n${await yxl.cutstr($.nolantoken)}`);
*/
    $.h5stTK=$.apidata.h5stTK
    $.h5stTK=$.toObj($.h5stTK,$.h5stTK)
// 获取紧急通知
    if($.apidata.notify!=='null'){
        console.log("\n=========通知=========\n",$.apidata.notify)
        message+="\n======通知======\n"+$.apidata.notify+"\n"
        await notify.sendNotify(`${$.name}`, `${message}`);
    }

// 根据设定运行时间启动助力
    if (nowHours==0||nowHours==23||$.apidata.runtime>0){    
        //执行助力
        console.debug(`设定运行时间:${$.apidata.runtime}点！`);
        console.log(`该你助力了,开始助力！`)

        $.sendNotifyStatus = false // 发送消息 true 为发送 false 不发送 默认 true
        $.maxHelpNumber = $.apidata.maxtime // 最大助力成功次数
        $.maxHelpErrCount = $.apidata.maxtime // 连续"活动太火爆了，请稍后重试"及访问京东API失败次数超过此值则停止助力

        if (!cookiesArr[0]) {
            $.msg($.name, '【提示】请先获取cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {
                'open-url': 'https://bean.m.jd.com/'
            })
            return
        }
        //$.token = $.apidata.jdapitoken||''// token
        $.whitelist = process.env.dpqd_wb_whitelist || whitelist // 白名单
        $.blacklist = process.env.dpqd_wb_blacklist || blacklist // 黑名单
        $.sendNotifyStatus = process.env.dpqd_wb_sendNotifyStatus || $.sendNotifyStatus + '' || true // 是否发送消息

        if($.openRed+"" == 'true'){
            $.openRed = true
        }else{
            $.openRed = false
        }
        console.log(`\n------ 变量设置 ------`)
        console.log(`${$.sendNotifyStatus+'' == 'true' ? '发送' : '不发送'}消息📜`)
        // ===========================================================================
        
        getWhitelist()
        getBlacklist()
        console.log("\n开始获取用于助力的账号列表")
        for (let i in cookiesArr) {
            // 将用于助力的账号加入列表
            let UserName = decodeURIComponent(cookiesArr[i].match(/pt_pin=([^; ]+)(?=;?)/) && cookiesArr[i].match(/pt_pin=([^; ]+)(?=;?)/)[1])
            helpToolsArr.push({id: i, UserName, assisted: false, cookie: cookiesArr[i]})
        }
        console.log(`用于助力的数目为 ${helpToolsArr.length}`)
        allMessage += `用于助力的数目为 ${helpToolsArr.length}\n`
        $.updateHelpData = false
        await run()
        // await $.wait(2000)
        console.log('本次助力次数：',$.totalhelptimes)
        await yxl[$.changeplan?'count1':'count']($.TK_SIGN.id,$.TK_SIGN.sign,'totalhelptimes',$.totalhelptimes)
        console.log('本次助力成功次数',$.successhelptimes)
        await yxl[$.changeplan?'count1':'count']($.TK_SIGN.id,$.TK_SIGN.sign,'successhelptimes',$.successhelptimes)
        if($.successhelptimes===0&&new Date().getHours() ==0) {console.log('你的第一次给了谁？')}  
//其他时段签到                  
    }else{
        console.log(`您今日已助力过，不再运行！`)
    } 
//发送消息
    if(allMessage){
        if($.errMsgPin.length > 0){
            let errmsg = `以下账号可能是火爆，请加入黑名单不然每次都消耗次数\ndpqd_wb_blacklist="${$.errMsgPin.join('&')}"`
            allMessage += "\n"+errmsg
        }
        $.msg($.name, '', `${allMessage}`)
        if ($.isNode() && sendFlag && $.sendNotifyStatus+'' == 'true'){
            await notify.sendNotify(`${$.name}`, `${allMessage}`);
        }
        if ($.isNode() && sendFlag && $.apidata.notify!=='null'){
            await notify.sendNotify(`${$.name}`, `${allMessage}`);
        }
    }
})()
    .catch((e) => console.log(e))
    .finally(() => $.done())

async function run() {
    let help = ''
    help = await getwbzlm()
    try {
        for(let i = 0; i < helpCookiesArr.length; i++) {
            await getUA()
            if(help && help.inviteCode && help.inviter && !$.hotFlag){
                if(help.helpNumber < $.maxHelpNumber){
                    await helpProcess(help)
                }
                if(help.msg){
                    allMessage += `助力信息：${help.msg}\n\n`
                }
            }
            if($.hotFlag){
                break
            }
        }  
    } catch (e) {
        console.log(e)
    }
}

async function ping() {
// 开始检测API接口是否能直接访问
    console.log(`开始检测API接口是否能直接访问！`)  
    if($.apidata.h5stchose=='n'||$.apidata.h5stchose=='ng'){
        starttime=Date.now()
        let Status=$.changeplan?await checkserver1('https://api.nolanstore.top/ping'):await checkserver1('https://api.nolanstore.top/ping')
        console.debug('N接口:',Status)
        if(Status*1 == 200){
            $.toStatus = true               
            endtime=Date.now()
            timeDelayN=endtime-starttime
            console.log('N接口可用，用时！',timeDelayN)
        }else{console.log('N接口无法直接访问！')}
    }
    if($.apidata.h5stchose=='g'||$.apidata.h5stchose=='ng'){
        starttime=Date.now()
        let Status=$.changeplan?await checkserver1('https://jd.smiek.tk/to_status'):await checkserver1('https://jd.smiek.tk/to_status')
        console.debug('G接口:',Status)
        if(Status*1== 200){
            $.toStatus = true                
            endtime=Date.now()
            timeDelayG=endtime-starttime
            console.log('G接口可用，用时',timeDelayG)
        }else{console.log('G接口无法直接访问！')}
    }
    if(!$.toStatus){ 
        console.log('无法连接服务器，将使用代理访问接口！')
    }else{
        timeDelayN<timeDelayG ? available='N' :available='G'
        console.log(available,'成功连接服务器！')
    }
}

async function helpProcess(help) {
    if($.PROXY_LIST.length>0){
        let pnum=await yxl.randomNumber(0, $.PROXY_LIST.length-1)
        let prox=$.PROXY_LIST[pnum]
        prox=$.toObj(prox,prox)
        console.debug('使用代理：',$.toStr(prox))
        PROXY_HOST=prox.ip
        PROXY_PORT=prox.port
    }

    $.totalhelptimes++
    while (helpToolsArr.length > 0) {
        let tool = helpToolsArr.pop()

        if($.dpqd_help[tool.UserName]){
            console.log('☹️',Number(tool.id)+1,$.dpqd_help[tool.UserName],'跳过')
            $.totalhelptimes--
            continue
        }
        
        if (help.UserName && tool.UserName == help.UserName) {
            helpToolsArr.unshift(tool)
        }
        
        let isLogin = await getLogin(tool.UserName, tool.cookie)
        if(isLogin){
            console.log('👉',Number(tool.id)+1,tool.UserName,'开始助力')
            if(available=='N'){
                await helpUserN(help, tool)
            } else if(available=='G'){
                await helpUserG(help, tool)
            } else(await helpUserN(help, tool))
            
        }else{
            console.log('    😭',Number(tool.id)+1,tool.UserName,'登录失败')
            continue
        }
        // await $.wait(10000) // 延迟
        if($.hotFlag){
            break
        }
        if (help.assist_full || $.successhelptimes >= $.maxHelpNumber) {
            console.log(`🎉${help.UserName} 助力完成`)
            break
        }else if(help.assist_out || help.helpErrCount >= $.maxHelpErrCount){
            console.log(`😴退出执行`)
            $.hotFlag = true
            break
        }
    }
    if($.updateHelpData){
        $.dpqd_help_list = {}
        $.dpqd_help_list[$.time("MM_dd")] = $.dpqd_help
        $.setdata($.dpqd_help_list, 'dpqd_help_list')
    }
}
async function helpUserG(help, tool) {
    try{
        let res = ''
        let h5st_res = ''
        let timestamp = Date.now()
        const body_in = { "linkId": linkId, "inviter": help.inviter, "inviteCode": help.inviteCode };
        const h5st_body = {
            appid: 'activities_platform',
            body: $.toStr(body_in, body_in),
            client: 'ios',
            clientVersion: '3.9.0',
            functionId: "happyDigHelp",
            t: timestamp.toString()
        }
        for (let i = 0; i < 3; i++) {
            if(!$.toStatus||!$.jdStatus){
                console.log('    🩸getproxy:','http://'+PROXY_HOST+':'+PROXY_PORT )
            }
            h5st_res = await yxl[$.changeplan?'getLog1':'getLog']($.TK_SIGN.id,$.apidata.appId,tool.UserName,h5st_body,$.h5stTK,$.toStatus,PROXY_HOST,PROXY_PORT)
            if(h5st_res && typeof h5st_res == 'object' && h5st_res.code == 200 && h5st_res.data && h5st_res.data.h5st){
                res = h5st_res.data
                // console.log(res)
                break
            }
        }

        if(!res){
            console.log('    😵获取不到算法')
            $.hotFlag = true
            return
        }
        if(res.ua){
          $.UA = res.ua
        }
        h5st = res.h5st || ''
        let ck = tool.cookie
        await requestApiG('happyDigHelp', ck, body_in, timestamp.toString(), h5st).then(async function (data) {
            // console.log(data)
            let desc = data.success && "助力成功" || data.errMsg || ""
            if (desc) {
                if (/助力成功/.test(desc)) {
                    await $.wait($.apidata.delay*1000)
                    $.dpqd_help[tool.UserName] = "已助力「"+help.UserName+"」"
                    help.helpCount += 1
                    $.successhelptimes++
                    tool.assisted = true
                    $.updateHelpData = true
                    help.helpErrCount = 0
                } else if (/参与者参与次数达到上限/.test(desc)) {
                    $.dpqd_help[tool.UserName] = "已助力他人"
                    tool.assisted = true
                    $.updateHelpData = true
                    help.helpErrCount = 0
                    $.totalhelptimes--
                } else if (/已经邀请过/.test(desc)) {
                    $.dpqd_help[tool.UserName] = "已助力「"+help.UserName+"」"
                    tool.assisted = true
                    $.updateHelpData = true
                    help.helpErrCount = 0
                    $.totalhelptimes--
                } else if (/^活动太火爆了，请稍后重试$/.test(desc)) {
                    help.helpErrCount++
                    desc = '账号火爆或者算法失效'
                    $.errMsgPin.push(tool.UserName)
                    if(help.helpErrCount >= $.maxHelpErrCount){
                        help.msg = desc
                        $.errMsgPin = []
                    }
                } else {
                    if(data.rtn_code != 0) //console.log(data)
                    // success
                    // 活动太火爆了，请稍后重试
                    // 已经邀请过
                    // 参与者参与次数达到上限
                    tool.assisted = true
                }
            } else {
                // undefined
                tool.assisted = true
            }
            console.log(`    ❤️${Number(tool.id)+1}->${(help.UserName).substring(0,5)}`, desc)
        })
    }catch(e){
        console.log(e)
    }
}
async function helpUserN(help, tool) {
    try{
        let h5st_res = ''
        let body={"linkId": "pTTvJeSTrpthgk9ASBVGsw","inviter": codestemp.inviter,"inviteCode": codestemp.inviteCode}
        for (let i = 0; i < 3; i++) {
            if(!$.toStatus||!$.jdStatus){
                console.log('    🩸getproxy:','http://'+PROXY_HOST+':'+PROXY_PORT)
            }
            h5st_res = await yxl[$.changeplan?'geth5st1':'geth5st']($.TK_SIGN.id,$.apidata.appId,'happyDigHelp',body,$.apidata.useragent,tool.UserName,$.h5stTK,$.toStatus,PROXY_HOST,PROXY_PORT)
            if(h5st_res && typeof h5st_res == 'object' && h5st_res.code == 200 && h5st_res.body){
                wbh5st = h5st_res.body
                // console.log(res)
                break
            }
        }
        if(!wbh5st){
            console.log('    😵获取不到算法')
            $.hotFlag = false
            return
        }
        let ck = tool.cookie
        await requestApiN(ck, wbh5st).then(async function (data) {
            // console.log(data)
            let desc = data.success && "助力成功" || data.errMsg || ""
            if (desc) {
                if (/助力成功/.test(desc)) {
                    await $.wait($.apidata.delay*1000)
                    $.dpqd_help[tool.UserName] = "已助力「"+help.UserName+"」"
                    help.helpCount += 1
                    $.successhelptimes++
                    tool.assisted = true
                    $.updateHelpData = true
                    help.helpErrCount = 0
                } else if (/参与者参与次数达到上限/.test(desc)) {
                    $.dpqd_help[tool.UserName] = "已助力他人"
                    tool.assisted = true
                    $.updateHelpData = true
                    help.helpErrCount = 0
                    $.totalhelptimes--
                } else if (/已经邀请过/.test(desc)) {
                    $.dpqd_help[tool.UserName] = "已助力「"+help.UserName+"」"
                    tool.assisted = true
                    $.updateHelpData = true
                    help.helpErrCount = 0
                    $.totalhelptimes--
                } else if (/^活动太火爆了，请稍后重试$/.test(desc)) {
                    help.helpErrCount++
                    desc = '账号火爆或者算法失效'
                    $.errMsgPin.push(tool.UserName)
                    if(help.helpErrCount >= $.maxHelpErrCount){
                        help.msg = desc
                        $.errMsgPin = []
                    }
                } else {
                    if(data.rtn_code != 0) //console.log(data)
                    // success
                    // 活动太火爆了，请稍后重试
                    // 已经邀请过
                    // 参与者参与次数达到上限
                    tool.assisted = true
                }
            } else {
                // undefined
                tool.assisted = true
            }
            console.log(`    ❤️${Number(tool.id)+1}->${(help.UserName).substring(0,5)}`, desc)
        })
    }catch(e){
        console.log(e)
    }
}
// 获取发财挖宝助力码固定
async function getwbzlm(){
    let helpNumber = 0
    let assist_out = false
    let msg = ''
    codestemp=$.fcwb[0]
    let UserName=codestemp.inviter
    return {
        inviteCode: codestemp.inviteCode,
        inviter: codestemp.inviter,
        assist_full: false,
        assist_out: assist_out,
        UserName,
        cookie: 'cookie',
        msg,
        helpCount: 0,
        helpNumber: helpNumber
    }
}

async function requestApiG(functionId, cookie, body = {}, t = Date.now(), h5st = '') {
    try{
        let ck = cookie
        let client = "H5"
        $.clientVersion = ""
        if(functionId == 'happyDigHelp'){
            // $.clientVersion = $.UA.split(';')[2]
            $.clientVersion = "3.9.0"
            client = "ios"
        }
        return new Promise(async resolve => {
            let options = {
                url: `https://api.m.jd.com/?functionId=${functionId}&body=${encodeURIComponent($.toStr(body))}&t=${t}&appid=activities_platform&client=${client}&clientVersion=${$.clientVersion ? $.clientVersion : '1.2.0'}${h5st ? '&h5st=' + h5st : ''}`,
                headers: {
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "zh-CN,zh-Hans;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Cookie": ck,
                    "origin": "https://bnzf.jd.com",
                    "Referer": "https://bnzf.jd.com/",
                    "User-Agent": $.UA,
                }
            }
            if(!$.jdStatus){proxy(options)}
            $.get(options, async (err, resp, data) => {
                try {
                    if (err) {
                        //console.log(`🛠️${$.toStr(err)}`)
                        console.log(`    🛠️${$.name} requestApiG请求失败！`)
                        help.helpErrCount++
                        $.jdStatus = false
                    } else {
                        data = $.toObj(data,data)
                    }
                } catch (e) {
                    console.log(e)
                } finally {
                    resolve(data)
                }
            });
        })
    }catch(e){
        console.log(e)
    }
}
async function requestApiN(cookie, wbh5st) {
    try{
        return new Promise(async resolve => {
            let options = {
                url: `https://api.m.jd.com/?${wbh5st}`,
                headers: {
                    'Host': 'api.m.jd.com',
                    'Origin': 'https://bnzf.jd.com',
                    'User-Agent': $.apidata.useragent,
                    'Cookie': cookie
                }
            }
            $.get(options, async (err, resp, data) => {
                try {
                    if (err) {
                        //console.log(`    🛠️${$.toStr(err)}`)
                        console.log(`    🛠️${$.name} requestApiN请求失败！`)
                        help.helpErrCount++
                        $.jdStatus = false
                    } else {
                        data = $.toObj(data,data)
                    }
                } catch (e) {
                    console.log(e)
                } finally {
                    resolve(data)
                }
            });
        })
    }catch(e){
        console.log(e)
    }
}
async function getLogin(UserName, ck) {
    return new Promise(resolve => {
        let options = {
            url: `https://me-api.jd.com/user_new/info/GetJDUserInfoUnion`,
            headers: {
                "Accept": "*/*",
                "Connection": "keep-alive",
                "Accept-Language": "zh-cn",
                "Accept-Encoding": "gzip, deflate, br",
                "Cookie": ck,
                "Referer": "https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&",
                "User-Agent": "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
            },
            timeout:10000
        }
        let msg = true
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    //console.log(`🛠️${$.toStr(err)}`)
                    console.log(`    🛠️${$.name} ck有效 API请求失败，请检查网路重试`)
                } else {
                    let res = $.toObj(data, data)
                    if (res.retcode+"" === "13" || res.retcode+"" === "1001") {
                        msg = false
                        console.log(`    🛠️账号「${UserName}」 Cookie失效`)
                    }else{
                        msg = true
                    }
                }
            } catch (e) {
                console.log(e)
            } finally {
                resolve(msg);
            }
        })
    })
}


//连接测试
async function checkserver1(url) { 
    let respcode=''   
    return new Promise(resolve => {
        let options = {
            url: url,
            timeout: 20000
        }
        $.get(options, async (err, resp, data) => {
            console.debug(data)
            try {
                if (err) {
                    console.debug(`连接服务器失败:`,err)
                } else {
                   let res = $.toObj(resp,resp)
                    if(res && typeof res == 'object'){
                        respcode=res.status
                    }
                }
            } catch (e) {
                console.debug(e)
            } finally {
                resolve(respcode)
            }
        })
    })
}
async function checkserver(url) {
	try {
		let config = {timeout: 20000}
		let {status,data} = await axios.get(url, config)
		console.debug(status,data)
		return status
	} catch (e) {console.debug('连接服务器失败！\n',e)}
}


/**
 * 黑名单
 */
 function getBlacklist(){
    if($.blacklist == '') return
    console.log('------- 黑名单 -------')
    const result = Array.from(new Set($.blacklist.split('&'))) // 数组去重
    console.log(`${result.join('\n')}`)
    let blacklistArr = result
    let arr = []
    let g = false
    for (let i = 0; i < cookiesArr.length; i++) {
        let s = decodeURIComponent((cookiesArr[i].match(/pt_pin=([^; ]+)(?=;?)/) && cookiesArr[i].match(/pt_pin=([^; ]+)(?=;?)/)[1]) || '')
        if(!s) break
        let f = false
        for(let n of blacklistArr){
            if(n && n == s){
                f = true
                break
            }
        }
        if(!f){
            g = true
            arr.splice(i,-1,cookiesArr[i])
        }
    }
    if(g) cookiesArr = arr
}
// 数组置顶移动
function toFirst(arr, index){
    if (index != 0) {
        arr.unshift(arr.splice(index, 1)[0])
    }
}
/**
 * 白名单
 */
function getWhitelist(){
    if($.whitelist == ''){
        helpCookiesArr = $.toObj($.toStr(cookiesArr,cookiesArr))
        return
    }
    console.log('------- 白名单 -------')
    const result = Array.from(new Set($.whitelist.split('&'))) // 数组去重
    console.log(`${result.join('\n')}`)
    let arr = []
    let whitelistArr = result
    for(let i in cookiesArr){
        let s = decodeURIComponent((cookiesArr[i].match(/pt_pin=([^; ]+)(?=;?)/) && cookiesArr[i].match(/pt_pin=([^; ]+)(?=;?)/)[1]) || '')
        if(whitelistArr.includes(s)){
            arr.push(cookiesArr[i])
        }
    }
    helpCookiesArr = arr
    if(whitelistArr.length > 1){
        for(let n in whitelistArr){
            let m = whitelistArr[whitelistArr.length - 1 - n]
            if(!m) continue
            for(let i in helpCookiesArr){
                let s = decodeURIComponent(helpCookiesArr[i].match(/pt_pin=([^; ]+)(?=;?)/) && helpCookiesArr[i].match(/pt_pin=([^; ]+)(?=;?)/)[1])
                if(m == s){
                    toFirst(helpCookiesArr, i)
                }
            }
        }
    }
}
async function getUA() {
    $.UA = `jdapp;iPhone;10.1.4;13.1.2;${randomString(40)};network/wifi;model/iPhone8,1;addressid/;appBuild/167814;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1`
}
function randomString(e) {
    e = e || 32
    let t = 'abcdef0123456789', a = t.length, n = ''
    for (i = 0; i < e; i++)
        n += t.charAt(Math.floor(Math.random() * a))
    return n
}

function jsonParse(str) {
    if (typeof str == 'string') {
        try {
            return JSON.parse(str)
        } catch (e) {
            console.log(e)
            $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
            return []
        }
    }
}
