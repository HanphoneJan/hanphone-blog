let yesButton=document.getElementById("yes");
let noButton = document.getElementById("no");
let questionText=document.getElementById("question");
let mainImage =document.getElementById("mainImage");
let clickcount =0;// 记录点击 No 的次数

// No 按钮的文字变化
const noTexts= [
"?你认真的吗..",
"要不再想想?(ˇˍˇ) ",
"不许选这个![○･｀Д´･ ○]",
"我会很伤心…",
"不行!o(╥﹏╥)o"
];
// No 按钮点击事件
noButton.addEventListener("click",function(){
clickcount++;
// 让 Yes 变大，每次放大 2 倍
let yessize=1+(clickcount + 1.2);
yesButton.style.transform=`scale(${yessize})`;
//挤压 No 按钮，每次右移 100px
let noOffset=clickcount*50;
noButton.style.transform=`translateX(${noOffset}px)`;
//**新增:让图片和文字往上移动*
let moveUp=clickcount*25;// 每次上移 20px
mainImage.style.transform = `translateY(-${moveUp}px)`;
questionText.style.transform =`translateY(-${moveUp}px)`;
// No 文案变化(前 5 次变化)
if(clickcount <=5){
noButton.innerText =noTexts[clickcount -1];
}

if(clickcount===1) mainImage.src = "images/shocked.png";
if(clickcount===2) mainImage.src = "images/think.png";
if(clickcount===3) mainImage.src = "images/angry.png";
if(clickcount===4) mainImage.src = "images/cry.png";
if(clickcount>=5) mainImage.src = "images/cry.png";
if(clickcount===7) noButton.style.display="none";
});// No 按钮点击事件结束


yesButton.addEventListener("click",function(){
    document.body.innerHTML = `
    <div class="yes-screen">
    <h1 class="yes-text">!!!喜欢你！(*^▽^*)</h1>
    <img src="images/love.jpg" alt="拥抱" class="yes-image">
    </div>
    `
    document.body.style.overflow = "hidden";
}
);