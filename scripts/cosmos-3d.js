import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const instances = [];
const textures = new Map();
const loader = new THREE.TextureLoader();
let scrollPosition = window.scrollY;
let frameId = 0;

function texture(name) {
  if (!textures.has(name)) {
    const map = loader.load(new URL("../assets/planets/" + name, import.meta.url).href, () => {
      renderFrame(performance.now());
    });
    map.colorSpace = THREE.SRGBColorSpace;
    textures.set(name, map);
  }
  return textures.get(name);
}

function createPlanet(name) {
  const planet = new THREE.Group();
  planet.name = name;
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 40),
    new THREE.MeshStandardMaterial({ map: texture(name + ".jpg"), roughness: 1, metalness: 0 })
  );
  planet.add(surface);
  planet.rotation.z = name === "saturn" ? -0.35 : 0.18;
  if (name === "saturn") {
    const geometry = new THREE.RingGeometry(1.22, 2.18, 128);
    const positions = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    // Map the source's radial strip onto the actual annular geometry.
    for (let i = 0; i < positions.count; i += 1) {
      uv.setXY(i, (Math.hypot(positions.getX(i), positions.getY(i)) - 1.22) / 0.96, 0.5);
    }
    const rings = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      map: texture("saturn-rings.png"), side: THREE.DoubleSide,
      transparent: true, opacity: 0.95, roughness: 1, depthWrite: false
    }));
    rings.rotation.x = -1.12;
    planet.add(rings);
  }
  planet.userData = { surface, spin: name === "earth" ? 0.045 : 0.032 };
  return planet;
}

function createStar(index, footer) {
  const star = new THREE.Group();
  const bright = index % 5 === 0;
  const material = new THREE.MeshBasicMaterial({
    color: footer ? (index % 3 ? 0xffffff : 0xf1cf82) : (index % 3 ? 0xb38a36 : 0x407f9f),
    transparent: true, opacity: bright ? 0.88 : 0.6, depthWrite: false
  });
  star.add(new THREE.Mesh(new THREE.CircleGeometry(bright ? 1.3 : 0.75, 12), material));
  if (bright) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 5);
    shape.lineTo(1, 1);
    shape.lineTo(4, 0);
    shape.lineTo(1, -1);
    shape.lineTo(0, -5);
    shape.lineTo(-1, -1);
    shape.lineTo(-4, 0);
    shape.lineTo(-1, 1);
    shape.closePath();
    star.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), material));
  }
  star.userData = {
    x: (Math.sin(index * 127.1 + 3.7) * 43758.5453) % 1 * 0.5 + 0.5,
    y: (Math.sin(index * 311.7 + 8.3) * 22578.1459) % 1 * 0.5 + 0.5,
    speed: 0.07 + (index % 4) * 0.045,
    material, bright
  };
  return star;
}

function setupScene(host, role) {
  if (!host) return;
  const renderer = new THREE.WebGLRenderer({
    alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "low-power"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
  camera.position.z = 600;
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const sunlight = new THREE.DirectionalLight(0xfff7e8, 2.6);
  sunlight.position.set(-240, 180, 400);
  scene.add(sunlight);
  const root = new THREE.Group();
  scene.add(root);
  const footer = role === "footer";
  const names = footer ? ["saturn", "jupiter", "earth"]
    : role === "left" ? ["saturn", "earth"] : ["jupiter", "neptune"];
  const planets = names.map((name) => {
    const planet = createPlanet(name);
    root.add(planet);
    return planet;
  });
  const stars = Array.from({ length: footer ? 55 : 32 }, (_, index) => {
    const star = createStar(index, footer);
    root.add(star);
    return star;
  });
  const instance = { host, role, renderer, scene, camera, root, planets, stars, width: 0, height: 0 };
  instances.push(instance);
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    instance.width = width;
    instance.height = height;
    if (width < 2 || height < 2) return;
    renderer.setSize(width, height, false);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    planets.forEach((planet) => {
      const radius = footer
        ? Math.min(width < 680 ? 26 : 44, width * 0.07)
        : Math.min(planet.name === "saturn" ? width * 0.19 : width * 0.32, 55);
      planet.scale.setScalar(radius);
    });
    renderFrame(performance.now());
  };
  instance.observer = new ResizeObserver(resize);
  instance.observer.observe(host);
  resize();
}

const sideHost = document.getElementById("site-cosmos-3d");
if (sideHost) {
  for (const role of ["left", "right"]) {
    const host = document.createElement("div");
    host.className = "cosmos-side-zone " + role;
    sideHost.appendChild(host);
    setupScene(host, role);
  }
}
setupScene(document.getElementById("footer-cosmos-3d"), "footer");

function wrap(value, span) {
  return ((value + span / 2) % span + span) % span - span / 2;
}

function renderFrame(time) {
  const reduced = motionQuery.matches;
  const t = reduced ? 0 : time * 0.001;
  const scroll = reduced ? 0 : scrollPosition;
  for (const instance of instances) {
    const { width, height, role, planets, stars } = instance;
    if (width < 2 || height < 2) continue;
    const footer = role === "footer";
    const rect = footer ? instance.host.getBoundingClientRect() : null;
    if (footer && (rect.top > window.innerHeight || rect.bottom < 0)) continue;
    const footerProgress = footer && !reduced
      ? THREE.MathUtils.clamp((window.innerHeight - rect.top) / (window.innerHeight + height), 0, 1) - 0.5
      : 0;

    planets.forEach((planet, index) => {
      if (footer) {
        planet.position.x = (index - 1) * width * (width < 680 ? 0.3 : 0.31) + footerProgress * (index % 2 ? -28 : 28);
        planet.position.y = (index === 1 ? -15 : 4) + footerProgress * (index + 1) * 12;
      } else {
        const span = height + 220;
        planet.position.y = wrap(height * (0.29 - index * 0.58) + scroll * (0.27 + index * 0.075), span);
        planet.position.x = Math.sin(scroll * 0.0016 + index * 2) * width * 0.045;
      }
      planet.userData.surface.rotation.y = (planet.name === "earth" ? 3.9 : 0.8) + t * planet.userData.spin + scroll * 0.00032;
    });
    stars.forEach((star, index) => {
      const data = star.userData;
      star.position.set(
        (data.x - 0.5) * Math.max(0, width - 16),
        footer ? (data.y - 0.5) * (height - 20) + footerProgress * data.speed * 70
          : wrap((data.y - 0.5) * height + scroll * data.speed, height + 20),
        -100
      );
      data.material.opacity = (data.bright ? 0.78 : 0.46) + (reduced ? 0 : Math.sin(t * 0.65 + index) * 0.14);
    });
    instance.renderer.render(instance.scene, instance.camera);
  }
}

function animate(time) {
  frameId = 0;
  renderFrame(time);
  if (!motionQuery.matches && !document.hidden) frameId = requestAnimationFrame(animate);
}

function updateMotion() {
  cancelAnimationFrame(frameId);
  frameId = 0;
  scrollPosition = window.scrollY;
  renderFrame(performance.now());
  if (!motionQuery.matches && !document.hidden) frameId = requestAnimationFrame(animate);
}

window.addEventListener("scroll", () => {
  scrollPosition = window.scrollY;
  if (motionQuery.matches) renderFrame(0);
}, { passive: true });
motionQuery.addEventListener("change", updateMotion);
document.addEventListener("visibilitychange", updateMotion);
window.felitziaCosmos3d = instances;
updateMotion();
