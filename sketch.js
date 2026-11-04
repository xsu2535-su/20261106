// ===== 圖片資源變數 =====
let stopImg;         // 站立（STOP）圖片
let walkImg;         // 走路（WALK）圖片
let runImg;          // 跑步（RUN）圖片
let jumpImg;         // 跳躍（JUMP）圖片
let slideImgs = [];  // 滑壘（Slide base）的 5 張獨立圖片（0.png ~ 4.png）

// ===== 每張圖片內的影格數量 =====
const STOP_FRAMES = 2; // STOP 圖片共 2 張
const WALK_FRAMES = 4; // WALK 圖片共 4 張
const RUN_FRAMES = 7;  // RUN 圖片共 7 張（整張 471*94）
const JUMP_FRAMES = 4; // JUMP 圖片共 4 張（整張 283*99）
const SLIDE_COUNT = 5; // 滑壘共 5 張（0.png ~ 4.png）

// ===== 角色顯示與移動設定 =====
const SCALE_FACTOR = 3;     // 角色放大倍數（想更大就調高這個數字）
const WALK_SPEED = 5;       // 走路速度（每幀移動的像素）
const RUN_SPEED = 12;       // 跑步速度（每幀移動的像素）
const GRAVITY = 1;          // 重力：每幀讓向下的速度增加多少
const JUMP_POWER = 22;      // 跳躍力道：起跳時向上的初速度
const ANIM_SPEED = 8;       // 一般動畫切換速度：數字越小換圖越快
const SLIDE_SPEED = 16;     // 滑壘起始速度（之後會越滑越慢）
const SLIDE_FRAME_TICKS = 6; // 滑壘每一張圖停留的幀數（越大滑越久）

// ===== 角色狀態變數 =====
let x;                    // 角色的 x 座標（中心點）
let groundY;              // 地面的 y 座標（角色腳底的位置）
let y;                    // 角色目前腳底的 y 座標（跳起來時會改變）
let vy = 0;               // 角色的垂直速度（正數向下，負數向上）
let facing = 1;           // 面向方向：1 = 朝右，-1 = 朝左
let sliding = false;      // 是否正在滑壘
let slideTimer = 0;       // 滑壘已經進行了幾幀
let slideRequest = false; // 是否剛按下滑壘鍵（只觸發一次）

// preload() 會在 setup() 之前執行，用來先載入圖片
function preload() {
  stopImg = loadImage('1/STOP/STOP.png'); // 載入 STOP 圖片
  walkImg = loadImage('1/WALK/WALK.png'); // 載入 WALK 圖片
  runImg = loadImage('1/RUN/RUN.png');    // 載入 RUN 圖片
  jumpImg = loadImage('1/JUMP/JUMP.png'); // 載入 JUMP 圖片
  // 用迴圈依序載入滑壘的 0.png ~ 4.png
  for (let i = 0; i < SLIDE_COUNT; i++) {
    slideImgs.push(loadImage('1/Slide base/' + i + '.png')); // 放進陣列
  }
}

// setup() 只會執行一次，用來做初始設定
function setup() {
  createCanvas(windowWidth, windowHeight);          // 建立全螢幕畫布
  x = width / 2;                                    // 角色 x 座標設在畫面水平中央
  groundY = height / 2 + 47 * SCALE_FACTOR;        // 腳底位置：讓角色大致落在畫面正中央
  y = groundY;                                      // 角色一開始站在地面上
  imageMode(CENTER);                                // 圖片以中心點作為繪製基準
}

// keyPressed() 在「按下按鍵的那一瞬間」只會執行一次
function keyPressed() {
  if (keyCode === DOWN_ARROW) { // 如果按下的是下方向鍵
    slideRequest = true;        // 記錄「要滑壘」，交給 draw() 處理
  }
}

// draw() 會不斷重複執行，每秒約 60 次
function draw() {
  background('#e3d5ca'); // 設定背景顏色為 e3d5ca

  // ----- 1. 讀取按鍵狀態 -----
  let right = keyIsDown(RIGHT_ARROW); // 是否按住右方向鍵
  let left = keyIsDown(LEFT_ARROW);   // 是否按住左方向鍵
  let running = keyIsDown(SHIFT);     // 是否按住 Shift（按著就是跑步）
  let jumpKey = keyIsDown(32) || keyIsDown(UP_ARROW); // 是否按空白鍵(32)或上方向鍵

  // ----- 2. 是否開始滑壘（要在地面上才能滑）-----
  if (slideRequest && !sliding && y >= groundY) { // 有滑壘請求、目前沒在滑、且站在地面
    sliding = true;   // 進入滑壘狀態
    slideTimer = 0;   // 計時歸零
  }
  slideRequest = false; // 請求已處理，清除

  let moving = false; // 預設角色沒有在水平移動

  if (sliding) {
    // ----- 3A. 滑壘中：往面向的方向滑，速度越來越慢 -----
    slideTimer++;                                       // 滑壘計時加 1
    let total = SLIDE_COUNT * SLIDE_FRAME_TICKS;        // 滑壘總共持續的幀數
    x += facing * SLIDE_SPEED * (1 - slideTimer / total); // 速度隨時間遞減，慢慢停下
    if (slideTimer >= total) {                          // 時間到
      sliding = false;                                  // 結束滑壘，回到一般狀態
    }
  } else {
    // ----- 3B. 一般狀態：左右移動 -----
    let speed = running ? RUN_SPEED : WALK_SPEED; // 跑步用較快的速度，否則用走路速度
    if (right) {          // 如果按住右鍵
      facing = 1;         // 面向右邊
      x += speed;         // x 座標增加，往右移動
      moving = true;      // 標記角色正在移動
    } else if (left) {    // 否則如果按住左鍵
      facing = -1;        // 面向左邊（稍後會把圖片翻轉）
      x -= speed;         // x 座標減少，往左移動
      moving = true;      // 標記角色正在移動
    }

    // ----- 跳躍：在地面上按跳躍鍵就起跳 -----
    if (y >= groundY && jumpKey) { // 在地面上又按了跳躍鍵
      vy = -JUMP_POWER;            // 給一個向上的初速度（y 越小越上面）
    }
  }

  // ----- 4. 重力（滑壘時角色在地面，不受影響）-----
  vy += GRAVITY;          // 重力讓速度持續向下增加
  y += vy;                // 用速度更新 y 座標
  if (y >= groundY) {     // 如果落到地面以下
    y = groundY;          // 把角色放回地面
    vy = 0;               // 垂直速度歸零
  }
  let inAir = (y < groundY); // 角色是否在空中

  // ----- 5. 左右邊界：走出畫面就從另一邊出現 -----
  if (x > width + 100) x = -100;  // 超出右邊界，從左邊出現
  if (x < -100) x = width + 100;  // 超出左邊界，從右邊出現

  // ----- 6. 依狀態選擇圖片、影格數與目前影格 -----
  let img;            // 這一幀要使用的圖片
  let frames;         // 這張圖片裡的影格數量
  let currentFrame;   // 目前要顯示第幾張（從 0 開始）
  if (sliding) {                         // 滑壘中
    let idx = min(floor(slideTimer / SLIDE_FRAME_TICKS), SLIDE_COUNT - 1); // 依時間換算第幾張
    img = slideImgs[idx];                // 使用對應的滑壘圖片
    frames = 1;                          // 每張滑壘圖片只有 1 個影格
    currentFrame = 0;                    // 所以固定顯示第 0 格
  } else {
    if (inAir) {                         // 在空中 → 跳躍動作
      img = jumpImg;
      frames = JUMP_FRAMES;
    } else if (moving && (running || facing === -1)) { // 地面上往左移動，或按住 Shift 移動 → 跑步動作
      img = runImg;
      frames = RUN_FRAMES;
    } else if (moving && facing === 1) { // 地面上往右走 → 走路動作
      img = walkImg;
      frames = WALK_FRAMES;
    } else {                             // 其他（不動或往左走）→ 站立圖片
      img = stopImg;
      frames = STOP_FRAMES;
    }
    currentFrame = floor(frameCount / ANIM_SPEED) % frames; // 循環播放影格
  }

  // ----- 7. 繪製角色 -----
  let frameW = img.width / frames; // 單一影格寬度 = 整張寬度 ÷ 張數
  let frameH = img.height;         // 單一影格高度 = 圖片高度

  push();                                     // 儲存繪圖狀態，避免翻轉影響其他東西
  translate(x, y);                            // 把座標原點移到角色「腳底」的位置
  scale(facing * SCALE_FACTOR, SCALE_FACTOR); // 放大角色；facing 為 -1 時左右翻轉
  // 圖片往上移半個高度，讓腳底對齊地面（不同高度的動作才不會浮在空中）
  // 參數：圖片, 畫面x, 畫面y, 畫面寬, 畫面高, 來源x, 來源y, 來源寬, 來源高
  image(img, 0, -frameH / 2, frameW, frameH, currentFrame * frameW, 0, frameW, frameH);
  pop();                                      // 還原剛才儲存的繪圖狀態
}

// 當瀏覽器視窗大小改變時，自動調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);   // 重新設定畫布為新的視窗大小
  groundY = height / 2 + 47 * SCALE_FACTOR;  // 重新計算地面高度
  if (y > groundY) y = groundY;              // 避免角色卡在地面以下
}