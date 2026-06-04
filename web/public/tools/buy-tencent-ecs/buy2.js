//登录，然后在控制台输入代码。但是这个抢不到！！！为什么呢？？
// 主定时器，每50ms执行一次
let interval = setInterval(() => {
    const ele = document.getElementsByClassName('qc-base-grid__row qc-base-grid--gutter-5n qc-base-grid--gutter-pad-0n')[0]
                .children[0]
                .getElementsByClassName('uno3-buy-card__btn')[0];
    console.log(ele.innerText)
    // 配置选择弹层的底部
    const button1 = document.getElementsByClassName('uno3-dialog-footer')
    if(button1 && button1.length>0){
        // 高频点击定时器（每30ms点击一次）
        setInterval(()=>{
            console.log('抢！！！')
            document.getElementsByClassName('uno3-dialog-footer-mobile')[0]
                    .getElementsByClassName('uno3-button uno3-button--primary')[0]
                    .click()
        },30)
        // 清除主定时器（停止主循环）
        clearInterval(interval)
        return
    }
    if (ele.innerText != '添加提醒' && ele.innerText != '取消提醒') {
      ele.click()
    }
  }, 50);