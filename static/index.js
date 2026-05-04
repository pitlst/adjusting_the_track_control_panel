const { Leafer, Line, Rect, Group, Text, Path } = LeaferUI;

const leafer = new Leafer({
  view: window,
  width: 1920,
  height: 1080,
  fill: "#000000",
});

const bg = new Rect({
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  fill: {
    type: "radial",
    stops: [
      { offset: 0, color: "#0d1424" },
      { offset: 0.6, color: "#080c18" },
      { offset: 1, color: "#000000" },
    ],
  },
});
leafer.add(bg);

const grid = new Group();
for (let x = 0; x < 1920; x += 28) {
  for (let y = 0; y < 1080; y += 28) {
    grid.add(
      new Rect({
        x,
        y,
        width: 2,
        height: 2,
        fill: "#1a2438",
        cornerRadius: 1,
      }),
    );
  }
}
leafer.add(grid);

const C_TRACK = "#d0d0d0";
const C_GREEN = "#2ecc71";
const C_BLUE = "#3498db";

const trackLayer = new Group();
const labelLayer = new Group();
const trainLayer = new Group();
leafer.add(trackLayer);
leafer.add(labelLayer);
leafer.add(trainLayer);

// ========== Track 类 ==========
class Track {
  constructor(points, strokeWidth = 8, strokeColor = C_TRACK) {
    this.points = points;
    this.strokeWidth = strokeWidth;
    this.strokeColor = strokeColor;
    this.label = { text: "", color: C_BLUE, size: 16 };

    this.line = new Line({
      points: this.points,
      stroke: this.strokeColor,
      strokeWidth: this.strokeWidth,
    });
    trackLayer.add(this.line);

    this.labelObj = null;
    this.labelBg = null;
  }

  setColor(color) {
    this.strokeColor = color;
  }

  setLabel(text = "", color = C_BLUE, size = 16) {
    if (text.length > 20) text = text.substring(0, 20);
    this.label = { text, color, size };
  }

  update() {
    this.line.set({ stroke: this.strokeColor });

    if (this.label.text) {
      if (!this.labelObj) {
        const midX = (this.points[0] + this.points[2]) / 2;
        const trackY = this.points[1];

        this.labelBg = new Rect({
          x: midX - 60,
          y: trackY - 40,
          width: 120,
          height: 24,
          fill: "transparent",
        });
        labelLayer.add(this.labelBg);

        this.labelObj = new Text({
          x: midX,
          y: trackY - 28,
          text: this.label.text,
          fill: this.label.color,
          fontSize: this.label.size,
          fontWeight: "bold",
          textAlign: "center",
          width: 120,
        });
        labelLayer.add(this.labelObj);
      }
      this.labelObj.set({ text: this.label.text, fill: this.label.color });
    } else {
      if (this.labelObj) {
        this.labelObj.set({ text: "" });
      }
    }
  }
}

// ========== 轨道布局 ==========
const Y1 = 120;
const Y2 = 260;
const Y3 = 420;
const Y4 = 600;
const Y5 = 820;
const XL = 100;
const XR = 1800;

const track0 = new Track([XL, Y1, XR, Y1], 8, C_TRACK);
const track1 = new Track([XL, Y2, XR, Y2], 8, C_TRACK);
const trackUp = new Track([XL, Y3, XR, Y3], 8, C_TRACK);
const track2 = new Track([XL, Y4, XR, Y4], 8, C_TRACK);
const track3 = new Track([XL, Y5, XR, Y5], 8, C_TRACK);

// 为轨道设置标签
track0.setLabel("0道", C_BLUE, 16);
track1.setLabel("1道", C_BLUE, 16);
trackUp.setLabel("上行", C_GREEN, 16);
track2.setLabel("2道", C_BLUE, 16);
track3.setLabel("3道", C_BLUE, 16);

// 所有轨道的数组（用于动画循环中统一更新）
const allTracks = [
  track0,
  track1,
  trackUp,
  track2,
  track3,
];

// ========== 动画循环 ==========
let tick = 0;

function loop() {
  tick++;
  // 示例：上行主轨道每60帧切换一次颜色
  if (tick % 60 === 0) {
    trackUp.setColor("#ff0000");
  } else if (tick % 60 === 30) {
    trackUp.setColor(C_TRACK);
  }
  // 更新所有轨道（颜色和标签自动应用）
  allTracks.forEach((t) => t.update());
  requestAnimationFrame(loop);
}
loop();
