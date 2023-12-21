import * as PIXI from "pixi.js";

// cursor
let cX = 0,
  cY = 0,
  mDown = false;

let shouldDrawStar = false;
let starGrowth = 0.6,
  starSize = 0,
  maxStarSize = 100;
const starGhost = new PIXI.Graphics();

// gravitational const
const G = 6.6743e-11;
// without this we can't really see anything move
const forceMultiplier = 1e13;

// some controllable params. Quite chaotic, not stable at extreme values
let maxVelocity = 50;
let simulationSpeedFactor = 1;
let distanceCap = 25;

document.getElementById("maxVelocity").addEventListener("input", function () {
  maxVelocity = parseFloat(this.value);
  document.getElementById("maxVelocityValue").textContent = this.value;
});

document
  .getElementById("simulationSpeed")
  .addEventListener("input", function () {
    simulationSpeedFactor = parseFloat(this.value);
    document.getElementById("simulationSpeedValue").textContent = this.value;
  });

document.getElementById("distanceCap").addEventListener("input", function () {
  distanceCap = parseFloat(this.value);
  document.getElementById("distanceCapValue").textContent = this.value;
});

class Body {
  constructor(mass, position, velocity, graphic) {
    this.mass = mass;
    this.position = position;
    this.velocity = velocity;
    this.graphic = graphic;
  }
}

let stars = [];

const app = new PIXI.Application({
  backgroundColor: "#112",
  width: 1200,
  height: 600,
});
document.body.appendChild(app.view);

app.view.addEventListener("mousedown", (e) => {
  mDown = true;
  cX = e.clientX;
  cY = e.clientY;
});

app.view.addEventListener("mouseup", () => {
  shouldDrawStar = true;
  mDown = false;
  app.stage.removeChild(starGhost);
});

app.view.addEventListener("mousemove", (e) => {
  cX = e.clientX;
  cY = e.clientY;
});

// animation loop
app.ticker.add((delta) => {
  if (mDown) drawGhost(delta);
  if (shouldDrawStar) drawStar();
  updateStars(delta);
});

const updateStars = (delta) => {
  // pass delta to sync simulation with framerate
  updateVelocity(stars, delta);
  updatePosition(stars, delta);
};

function calculateGravitationalForce(body1, body2) {
  let dx = body2.position.x - body1.position.x;
  let dy = body2.position.y - body1.position.y;

  // wrap-around
  dx -= Math.sign(dx) * Math.max(0, Math.abs(dx) - app.screen.width / 2);
  dy -= Math.sign(dy) * Math.max(0, Math.abs(dy) - app.screen.height / 2);

  const distanceSq = dx * dx + dy * dy;
  const distance = Math.sqrt(distanceSq);
  // capping min distance to avoid slingshots;
  const cappedDistance = Math.max(distance, distanceCap);
  const cappedDistanceSq = cappedDistance * cappedDistance;
  const forceMagnitude =
    ((G * (body1.mass * body2.mass)) / cappedDistanceSq) * forceMultiplier;

  return {
    x: (forceMagnitude * dx) / cappedDistanceSq,
    y: (forceMagnitude * dy) / cappedDistanceSq,
  };
}

function updateVelocity(bodies, delta) {
  bodies.forEach((body, index) => {
    const netForce = { x: 0, y: 0 };
    bodies.forEach((otherBody, otherIndex) => {
      if (index !== otherIndex) {
        const force = calculateGravitationalForce(body, otherBody);
        netForce.x += force.x;
        netForce.y += force.y;
      }
    });

    let newVelocityX =
      body.velocity.x +
      (netForce.x / body.mass ** 2) * delta * simulationSpeedFactor;
    let newVelocityY =
      body.velocity.y +
      (netForce.y / body.mass ** 2) * delta * simulationSpeedFactor;

    const speed = Math.sqrt(
      newVelocityX * newVelocityX + newVelocityY * newVelocityY
    );
    if (speed > maxVelocity) {
      newVelocityX *= maxVelocity / speed;
      newVelocityY *= maxVelocity / speed;
    }

    body.velocity.x = newVelocityX;
    body.velocity.y = newVelocityY;
  });
}

function updatePosition(bodies, delta) {
  bodies.forEach((body) => {
    body.position.x += body.velocity.x * delta * simulationSpeedFactor;
    body.position.y += body.velocity.y * delta * simulationSpeedFactor;

    // wrap-around
    body.position.x = (body.position.x + app.screen.width) % app.screen.width;
    body.position.y = (body.position.y + app.screen.height) % app.screen.height;

    body.graphic.x = body.position.x;
    body.graphic.y = body.position.y;
  });
}

const drawGhost = (delta) => {
  starGhost.clear();
  starGhost.beginFill(0x333344, 0.4);
  starGhost.drawCircle(
    cX,
    cY,
    (starSize += starSize >= maxStarSize ? 0 : starGrowth * delta)
  );
  starGhost.endFill();
  app.stage.addChild(starGhost);
};

const drawStar = () => {
  let star = new PIXI.Graphics();
  star.beginFill(0xffffff, 0.5);
  star.drawCircle(0, 0, starSize);
  star.endFill();
  star.x = cX;
  star.y = cY;

  const newStar = new Body(starSize, { x: cX, y: cY }, { x: 0, y: 0 }, star);
  stars.push(newStar);
  app.stage.addChild(star);

  starSize = 0;
  shouldDrawStar = false;
};

app.start();
