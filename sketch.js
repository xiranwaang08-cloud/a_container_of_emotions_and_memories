const archiveSlots = [];
const images = [];
const archiveLoadErrors = [];
let archiveImageCount = 0;
const humanTagCategories = [
  {
    label: "ARCHITECTURAL / MATERIAL",
    tags: ["Liminal Space", "Industrial Decay", "Poolroom", "Subterranean"]
  },
  {
    label: "SPATIAL / ARCHITECTURAL",
    tags: ["Architecture", "Empty Spaces", "Physical Spaces", "Concrete Core"]
  },
  {
    label: "PSYCHOLOGICAL / EMOTIONAL",
    tags: ["Nostalgia", "Anemoia", "Isolation", "Uncanny", "Eerie Silence"]
  }
];

let selectedImageIndex = 0;
let machineMetadata = {};
let taggingPrompt = false;
let endingState = "idle";
let endingStartedAt = 0;
let hitTargets = [];
let carouselStart = 0;
let humanLabelScale = 0;
let targetHumanLabelScale = 0;
let mode = "landing";
let previousMode = "landing";
let transitionStartedAt = 0;
let gridScroll = 0;
let gridLayout = [];
let guidedRound = 0;
let guidedChoices = [];
let guidedHistory = [];
let guidedSelection = null;
let guidedDeck = [];
let guidedSeen = new Set();
const visitedImages = new Set();
const interactedImages = new Set();
const guidedPrompts = [
  "Which of these spaces feels like a ruin?",
  "Select a space with personal meaning.",
  "Which image feels most abandoned?",
  "Choose the space that feels least human."
];

function preload() {
  loadJSON(
    "assets-manifest.json",
    manifest => loadArchiveImages(manifest),
    error => console.error("Could not load assets-manifest.json", error)
  );
}

function loadArchiveImages(manifest) {
  if (!Array.isArray(manifest)) {
    console.error("assets-manifest.json must contain an array of image paths.");
    return;
  }

  const imagePaths = manifest
    .filter(path => typeof path === "string" && /^assets\/.+\.(?:jpe?g|png|gif|webp)$/i.test(path))
    .sort((left, right) => left.localeCompare(right, undefined, {
      numeric: true,
      sensitivity: "base"
    }));

  archiveImageCount = imagePaths.length;
  archiveSlots.length = archiveImageCount;
  images.length = 0;
  archiveLoadErrors.length = 0;

  for (let index = 0; index < imagePaths.length; index++) {
    const path = imagePaths[index];
    archiveSlots[index] = { settled: false };
    loadImage(
      path,
      image => {
        archiveSlots[index] = { index, path, image, tags: [], settled: true };
        finishArchiveSlot(index);
      },
      error => {
        archiveLoadErrors.push(path);
        console.error(`Could not load image: ${path}`, error);
        finishArchiveSlot(index);
      }
    );
  }
}

function finishArchiveSlot(index) {
  if (archiveSlots[index]) archiveSlots[index].settled = true;
  if (!archiveSlots.every(slot => slot && slot.settled)) return;

  images.splice(0, images.length, ...archiveSlots.filter(slot => slot.image));
  selectedImageIndex = images[0]?.index ?? 0;
  carouselStart = 0;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("monospace");
  textStyle(NORMAL);
  updateMachineMetadata();
  visitedImages.add(selectedImageIndex);
}

function draw() {
  background(12);
  hitTargets = [];

  if (endingState !== "idle") {
    drawEnding();
    return;
  }

  if (mode === "landing") drawLanding();
  else if (mode === "guided") drawGuidedStudy();
  else if (mode === "grid") drawGridOverlay();
  else drawArchiveView();

  drawModeTransition();
}

function drawLanding() {
  const cx = width / 2;
  fill(237);
  noStroke();
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(min(42, max(26, width / 20)));
  text("UNCERTAIN ARCHIVE", cx, height * 0.16);
  textStyle(NORMAL);
  fill(130);
  textSize(11);
  text("CHOOSE HOW YOU WANT TO ENTER THE COLLECTION", cx, height * 0.16 + 58);

  const cardW = min(390, (width - 72) / 2);
  const cardH = min(220, height * 0.31);
  const gap = 24;
  const startX = cx - cardW - gap / 2;
  const cardY = height * 0.38;
  const cards = [
    ["EXPLORE ARCHIVE", "FREE EXPLORATION", "Browse the full archive, inspect machine vision, and add your own human tags.", () => enterMode("explore")],
    ["GUIDED STUDY", "QUICK Q&A CHALLENGE", "Complete 4 short rounds from a small selection of images.", () => enterMode("guided")]
  ];

  cards.forEach((card, index) => {
    const x = index === 0 ? startX : cx + gap / 2;
    const hover = mouseX >= x && mouseX <= x + cardW && mouseY >= cardY && mouseY <= cardY + cardH;
    stroke(hover ? color(214, 255, 84) : color(83));
    fill(hover ? color(28, 31, 22) : color(18));
    rect(x, cardY, cardW, cardH);
    noStroke();
    fill(214, 255, 84);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(18);
    text(card[0], x + 24, cardY + 28);
    textStyle(NORMAL);
    fill(135);
    textSize(9);
    text(card[1], x + 24, cardY + 58);
    fill(210);
    textSize(12);
    text(card[2], x + 24, cardY + 94, cardW - 48, 70);
    fill(214, 255, 84);
    textSize(10);
    text("ENTER  →", x + 24, cardY + cardH - 34);
    addHitTarget(x, cardY, cardW, cardH, card[3]);
  });

  fill(105);
  textAlign(CENTER, BOTTOM);
  textSize(9);
  text(`${getAvailableImages().length || 239} IMAGE MEDIA POOL`, cx, height - 24);
}

function drawGridToggle() {
  const label = "∷  GRID / PROGRESS";
  textAlign(RIGHT, CENTER);
  textSize(9);
  const w = 118;
  const gap = 7;
  const switchW = 104;
  const x = width - 24 - switchW - gap - w;
  const buttonRight = x + w;
  const y = 12;
  const hover = mouseX >= x && mouseX <= buttonRight && mouseY >= y && mouseY <= y + 26;
  stroke(hover ? color(214, 255, 84) : color(82));
  fill(hover ? color(45, 52, 24) : color(18));
  rect(x, y, w, 26);
  noStroke();
  fill(hover ? color(214, 255, 84) : color(185));
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + 13);
  addHitTarget(x, y, w, 26, () => enterMode("grid"));

  drawModeSwitchToggle(buttonRight + gap, y);
}

function drawModeSwitchToggle(x, y) {
  const w = 104;
  const label = "MODE / SWITCH";
  const hover = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + 26;
  stroke(hover ? color(214, 255, 84) : color(82));
  fill(hover ? color(45, 52, 24) : color(18));
  rect(x, y, w, 26);
  noStroke();
  fill(hover ? color(214, 255, 84) : color(185));
  textAlign(CENTER, CENTER);
  textSize(9);
  text(label, x + w / 2, y + 13);
  addHitTarget(x, y, w, 26, resetToLanding);
}

function drawHeaderAndCarousel() {
  const topHeight = getTopHeight();
  const selected = getSelectedImage();

  fill(225);
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(13);
  text("UNCERTAIN ARCHIVE  /  IMAGE STUDY", 24, 25);
  fill(125);
  textSize(10);
  const unavailableCount = archiveImageCount - getAvailableImages().length;
  const poolStatus = unavailableCount
    ? `${getAvailableImages().length}/${archiveImageCount} LOADED  /  ${unavailableCount} MISSING`
    : `${getAvailableImages().length} IMAGES IN MEDIA POOL`;
  text(poolStatus, width - 260, 25);
  textAlign(RIGHT, CENTER);

  drawGridToggle();

  stroke(75);
  line(24, 45, width - 24, 45);
  noStroke();
  fill(145);
  textAlign(LEFT, CENTER);
  textSize(10);
  text("MEDIA POOL  /  SELECT AN IMAGE", 24, 62);

  const available = getAvailableImages();
  if (available.length === 0) {
    fill(205, 90, 80);
    text("No images loaded. Check the assets folder and filename extensions.", 24, 100);
    return;
  }
  fill(110);
  textAlign(RIGHT, CENTER);
  textSize(9);
  text(
    `${carouselStart + 1}-${min(carouselStart + getCarouselVisibleCount(), available.length)} / ${available.length}`,
    width - 24,
    62
  );

  const itemWidth = 48;
  const gap = 9;
  const startX = 24;
  const itemY = 77;
  const maxVisible = max(1, floor((width - 96) / (itemWidth + gap)));
  carouselStart = constrain(carouselStart, 0, max(0, available.length - maxVisible));

  drawCarouselArrow(available, -1, 9, itemY + 28);
  drawCarouselArrow(available, 1, width - 9, itemY + 28);

  for (let visibleIndex = 0; visibleIndex < maxVisible; visibleIndex++) {
    const archiveIndex = carouselStart + visibleIndex;
    const entry = available[archiveIndex];
    if (!entry) break;

    const x = startX + visibleIndex * (itemWidth + gap);
    const active = entry.index === selectedImageIndex;
    noStroke();
    fill(active ? color(220) : color(47));
    rect(x, itemY, itemWidth, 57);
    drawImageCover(entry.image, x + 3, itemY + 3, itemWidth - 6, 51);
    noFill();
    stroke(active ? color(214, 255, 84) : color(82));
    strokeWeight(active ? 2 : 1);
    rect(x, itemY, itemWidth, 57);
    strokeWeight(1);

    fill(active ? color(214, 255, 84) : color(145));
    noStroke();
    textAlign(LEFT, TOP);
    textSize(9);
    text(nf(entry.index, 3), x, itemY + 61);
    addHitTarget(x, itemY, itemWidth, 57, () => selectImage(entry.index));
  }

  if (selected) {
    fill(114);
    textAlign(RIGHT, CENTER);
    textSize(9);
    text(selected.path.replace("assets/", ""), width - 24, topHeight - 12);
  }

  stroke(65);
  line(24, topHeight, width - 24, topHeight);
  noStroke();
}

function drawCarouselArrow(available, direction, x, y) {
  const visible = getCarouselVisibleCount();
  const canMove = direction < 0
    ? carouselStart > 0
    : carouselStart + visible < available.length;
  fill(canMove ? 170 : 58);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);
  text(direction < 0 ? "‹" : "›", x, y);
  addHitTarget(x - 12, y - 17, 24, 34, () => {
    if (!canMove) return;
    carouselStart = constrain(carouselStart + direction * visible, 0, max(0, available.length - visible));
  });
}

function drawWorkspaces() {
  const topHeight = getTopHeight();
  const menuHeight = getMenuHeight();
  const workspaceTop = topHeight + 1;
  const workspaceHeight = max(150, height - workspaceTop - menuHeight);
  const half = width / 2;

  fill(18);
  noStroke();
  rect(0, workspaceTop, half, workspaceHeight);
  fill(14);
  rect(half, workspaceTop, width - half, workspaceHeight);
  stroke(64);
  line(half, workspaceTop, half, workspaceTop + workspaceHeight);
  noStroke();

  drawHumanPanel(0, workspaceTop, half, workspaceHeight);
  drawMachinePanel(half, workspaceTop, width - half, workspaceHeight);
}

function drawHumanPanel(x, y, panelWidth, panelHeight) {
  const selected = getSelectedImage();
  const pad = 22;
  humanLabelScale += (targetHumanLabelScale - humanLabelScale) * 0.14;

  fill(214, 255, 84);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(10);
  text("01  /  HUMAN VISION  —  ACTIVE", x + pad, y + 18);

  fill(128);
  textSize(9);
  text("Choose the feelings or meanings you associate with this image.", x + pad, y + 36);

  const tagColumns = panelWidth < 420 ? 1 : 2;
  const tagHeaderHeight = 13 + humanLabelScale * 3;
  const tagRowHeight = 22 + humanLabelScale * 7;
  const tagCategoryGap = 4 + humanLabelScale * 3;
  const buttonHeight = 19 + humanLabelScale * 5;
  const tagAreaHeight = 17 + humanTagCategories.reduce(
    (total, category) => total + tagHeaderHeight + ceil(category.tags.length / tagColumns) * tagRowHeight + tagCategoryGap,
    0
  );
  const imageTop = y + 62;
  const imageBottom = y + panelHeight - tagAreaHeight - 14;
  const imageAreaWidth = panelWidth - pad * 2;
  const imageAreaHeight = max(60, imageBottom - imageTop);

  if (selected) {
    drawImageContain(selected.image, x + pad, imageTop, imageAreaWidth, imageAreaHeight);
    fill(105);
    noStroke();
    textAlign(LEFT, BOTTOM);
    textSize(9);
    text(selected.path.replace("assets/", ""), x + pad, imageBottom + 11);
  } else {
    fill(145);
    textAlign(CENTER, CENTER);
    textSize(11);
    text("Waiting for image files…", x + panelWidth / 2, imageTop + imageAreaHeight / 2);
  }

  const controlsY = y + panelHeight - tagAreaHeight;
  stroke(59);
  line(x + pad, controlsY - 8, x + panelWidth - pad, controlsY - 8);
  noStroke();
  fill(taggingPrompt ? color(214, 255, 84) : color(150));
  textAlign(LEFT, TOP);
  textSize(9);
  text(
    taggingPrompt ? "SELECT TAGS  /  CLICK AGAIN TO REMOVE" : "HUMAN TAGS  /  SCROLL TO RESIZE",
    x + pad,
    controlsY
  );

  const gap = 6;
  const buttonWidth = (panelWidth - pad * 2 - gap * (tagColumns - 1)) / tagColumns;
  let categoryY = controlsY + 17;

  for (const category of humanTagCategories) {
    fill(214, 255, 84);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(8 + humanLabelScale * 2);
    text(category.label, x + pad, categoryY);
    categoryY += tagHeaderHeight;

    category.tags.forEach((tag, index) => {
      const row = floor(index / tagColumns);
      const column = index % tagColumns;
      const buttonX = x + pad + column * (buttonWidth + gap);
      const buttonY = categoryY + row * tagRowHeight;
      const applied = selected && selected.tags.includes(tag);

      stroke(applied ? color(214, 255, 84) : color(85));
      fill(applied ? color(47, 54, 23) : color(22));
      rect(buttonX, buttonY, buttonWidth, buttonHeight);
      noStroke();
      fill(applied ? color(226, 255, 150) : color(205));
      textAlign(CENTER, CENTER);
      textSize((panelWidth < 420 ? 8 : 9) + humanLabelScale * 2);
      text(tag.toUpperCase(), buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
      addHitTarget(buttonX, buttonY, buttonWidth, buttonHeight, () => toggleTag(tag));
    });

    categoryY += ceil(category.tags.length / tagColumns) * tagRowHeight + tagCategoryGap;
  }
}

function drawMachinePanel(x, y, panelWidth, panelHeight) {
  const pad = 22;
  const selected = getSelectedImage();
  const contentTop = y + 52;
  const metadataTextSize = panelWidth < 420 ? 12 : 14;
  const metadataLineGap = metadataTextSize + 12;
  const metadataBlockHeight = metadataTextSize + metadataLineGap * 3 + 16;
  const contentHeight = min(
    300,
    max(65, panelHeight - 52 - 10 - metadataBlockHeight - 18)
  );
  const boxX = x + pad;
  const boxY = contentTop;
  const boxWidth = panelWidth - pad * 2;
  const boxHeight = contentHeight;

  fill(93, 255, 149);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(10);
  text("02  /  MACHINE VISION  —  AUTOMATED", x + pad, y + 18);
  fill(116);
  textSize(9);
  text("SIMULATED MODEL  /  CLASSIFICATION IN PROGRESS", x + pad, y + 36);

  noFill();
  stroke(54, 117, 76);
  rect(boxX, boxY, boxWidth, boxHeight);
  stroke(28, 70, 45);
  line(boxX + boxWidth / 2, boxY, boxX + boxWidth / 2, boxY + boxHeight);
  line(boxX, boxY + boxHeight / 2, boxX + boxWidth, boxY + boxHeight / 2);

  if (selected) {
    tint(132, 255, 170, 100);
    drawImageContain(selected.image, boxX + 8, boxY + 8, boxWidth - 16, boxHeight - 16);
    noTint();
    const scanY = boxY + 8 + ((millis() / 13) % max(1, boxHeight - 16));
    stroke(94, 255, 144, 185);
    line(boxX + 3, scanY, boxX + boxWidth - 3, scanY);
    noStroke();
    fill(93, 255, 149);
    textAlign(LEFT, TOP);
    textSize(9);
    text("SCAN // " + nf(floor((millis() / 29) % 9999), 4), boxX + 8, boxY + 8);
  }

  const metaY = boxY + boxHeight + 10;
  fill(170);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(metadataTextSize);
  text(`GRAYSCALE DENSITY     ${machineMetadata.grayscale || "--"}%`, x + pad, metaY);
  text(`EDGE RATIO            ${machineMetadata.edge || "--"}%`, x + pad, metaY + metadataLineGap);
  text(`CONFIDENCE            ${machineMetadata.confidence || "--"}%`, x + pad, metaY + metadataLineGap * 2);
  fill(93, 255, 149);
  textStyle(BOLD);
  textSize(metadataTextSize);
  text(`OUTPUT  /  ${machineMetadata.label || "AWAITING INPUT"}`, x + pad, metaY + metadataLineGap * 3);
  textStyle(NORMAL);
}

function drawMenuBar() {
  const actions = [
    ["SHUFFLE ARCHIVE", shuffleArchive],
    ["CLASSIFY / TAG", () => {
      taggingPrompt = !taggingPrompt;
    }],
    ["RESTART", restartArchive],
    ["SWITCH MODE", resetToLanding],
    ["END / FINISH SESSION", startEnding]
  ];
  drawBottomActions(actions);
}

function drawBottomActions(actions) {
  const menuHeight = getMenuHeight();
  const menuY = height - menuHeight;
  stroke(84);
  line(0, menuY, width, menuY);
  noStroke();
  fill(11);
  rect(0, menuY + 1, width, menuHeight);

  const buttonGap = 8;
  const sidePadding = 22;
  const buttonWidth = (width - sidePadding * 2 - buttonGap * (actions.length - 1)) / actions.length;
  const buttonHeight = min(34, menuHeight - 18);
  const buttonY = menuY + (menuHeight - buttonHeight) / 2;

  actions.forEach(([label, action], index) => {
    const x = sidePadding + index * (buttonWidth + buttonGap);
    const isActive = (index === 1 && taggingPrompt) || (mode === "guided" && guidedSelection && label === "SUBMIT SELECTION");
    const isEndAction = index === actions.length - 1;
    const isHover = mouseX >= x && mouseX <= x + buttonWidth && mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
    stroke(isActive || isHover ? color(214, 255, 84) : isEndAction ? color(144, 91, 82) : color(115));
    fill(isActive ? color(45, 52, 24, 235) : isEndAction ? color(58, 29, 27, 225) : isHover ? color(42, 44, 42, 235) : color(34, 36, 35, 230));
    rect(x, buttonY, buttonWidth, buttonHeight);
    noStroke();
    fill(isActive ? color(214, 255, 84) : isEndAction ? color(239, 177, 156) : color(238));
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(width < 520 ? 9 : 11);
    text(label, x + buttonWidth / 2, buttonY + buttonHeight / 2);
    textStyle(NORMAL);
    addHitTarget(x, buttonY, buttonWidth, buttonHeight, action);
  });
}

function drawGridOverlay() {
  background(12);
  const pad = 24;
  const top = 78;
  fill(237);
  noStroke();
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(16);
  text("ARCHIVE / GRID PROGRESS", pad, 24);
  textStyle(NORMAL);
  fill(120);
  textSize(10);
  const interacted = interactedImages.size;
  text(`${interacted} LABELED  /  ${visitedImages.size} VISITED  /  ${getAvailableImages().length} TOTAL`, pad, 50);

  const closeW = 96;
  stroke(92);
  fill(18);
  rect(width - pad - closeW, 22, closeW, 30);
  noStroke();
  fill(214, 255, 84);
  textAlign(CENTER, CENTER);
  textSize(10);
  text("CLOSE  ×", width - pad - closeW / 2, 37);
  addHitTarget(width - pad - closeW, 22, closeW, 30, () => enterMode("explore"));

  const gap = 8;
  const columns = constrain(floor((width - pad * 2) / 118), 3, 12);
  const columnWidth = (width - pad * 2 - gap * (columns - 1)) / columns;
  const columnHeights = Array(columns).fill(0);
  const available = getAvailableImages();
  gridLayout = [];

  available.forEach((entry, index) => {
    const column = columnHeights.indexOf(min(...columnHeights));
    const thumbH = columnWidth * (0.72 + (index % 5) * 0.09);
    const thumbY = top + columnHeights[column] - gridScroll;
    const thumbX = pad + column * (columnWidth + gap);
    gridLayout.push({ entry, x: thumbX, y: thumbY, w: columnWidth, h: thumbH });
    columnHeights[column] += thumbH + gap;

    if (thumbY + thumbH < 0 || thumbY > height) return;
    const active = entry.index === selectedImageIndex;
    const labeled = interactedImages.has(entry.index);
    const visited = visitedImages.has(entry.index);
    stroke(labeled ? color(214, 255, 84) : active ? color(235) : color(58));
    strokeWeight(labeled || active ? 2 : 1);
    fill(25);
    rect(thumbX, thumbY, columnWidth, thumbH);
    if (visited || labeled) drawImageCover(entry.image, thumbX + 2, thumbY + 2, columnWidth - 4, thumbH - 4);
    else {
      tint(255, 65);
      drawImageCover(entry.image, thumbX + 2, thumbY + 2, columnWidth - 4, thumbH - 4);
      noTint();
    }
    strokeWeight(1);
    if (labeled) {
      fill(214, 255, 84);
      noStroke();
      circle(thumbX + columnWidth - 9, thumbY + 9, 12);
    }
    addHitTarget(thumbX, thumbY, columnWidth, thumbH, () => {
      selectImage(entry.index);
      enterMode("explore");
    });
  });

  const contentH = max(...columnHeights) + top;
  gridScroll = constrain(gridScroll, 0, max(0, contentH - height + 24));
}

function drawGuidedStudy() {
  background(12);
  const cx = width / 2;
  fill(214, 255, 84);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(10);
  text(`GUIDED STUDY  /  ROUND ${min(guidedRound + 1, guidedPrompts.length)} OF ${guidedPrompts.length}`, cx, 28);

  if (guidedRound >= guidedPrompts.length) {
    fill(237);
    textStyle(BOLD);
    textSize(min(28, width / 18));
    text("STUDY COMPLETE", cx, height * 0.34);
    textStyle(NORMAL);
    fill(140);
    textSize(12);
    text(`${guidedHistory.length} CHOICES RECORDED`, cx, height * 0.34 + 48);
    drawGuidedMenuBar();
    return;
  }

  fill(235);
  textStyle(BOLD);
  textSize(min(24, max(16, width / 36)));
  text(guidedPrompts[guidedRound], cx, 72, min(width - 48, 900));
  textStyle(NORMAL);
  const gap = 14;
  const choiceWidth = min(230, (width - 48 - gap * (guidedChoices.length - 1)) / max(1, guidedChoices.length));
  const totalWidth = choiceWidth * guidedChoices.length + gap * (guidedChoices.length - 1);
  const choiceX = cx - totalWidth / 2;
  const choiceY = height * 0.26;
  const choiceH = min(340, height * 0.52);
  guidedChoices.forEach((entry, index) => {
    const x = choiceX + index * (choiceWidth + gap);
    const selected = guidedSelection && guidedSelection.index === entry.index;
    const hover = mouseX >= x && mouseX <= x + choiceWidth && mouseY >= choiceY && mouseY <= choiceY + choiceH;
    stroke(selected ? color(214, 255, 84) : hover ? color(170) : color(75));
    strokeWeight(selected ? 3 : 1);
    fill(18);
    rect(x, choiceY, choiceWidth, choiceH);
    drawImageContain(entry.image, x + 8, choiceY + 8, choiceWidth - 16, choiceH - 16);
    strokeWeight(1);
    addHitTarget(x, choiceY, choiceWidth, choiceH, () => {
      guidedSelection = entry;
      visitedImages.add(entry.index);
    });
  });

  drawGuidedMenuBar();
}

function drawGuidedMenuBar() {
  const actions = guidedRound >= guidedPrompts.length
    ? [
      ["MODE SELECT", () => enterMode("landing")],
      ["RESTART CHALLENGE", startGuidedStudy],
      ["END / FINISH SESSION", startEnding]
    ]
    : [
      ["MODE SELECT", () => enterMode("landing")],
      ["SUBMIT SELECTION", submitGuidedSelection],
      ["NEXT QUESTION", submitGuidedSelection],
      ["END / FINISH SESSION", startEnding]
    ];
  drawBottomActions(actions);
}

function drawSimpleButton(x, y, w, h, label, action) {
  stroke(100);
  fill(18);
  rect(x, y, w, h);
  noStroke();
  fill(214, 255, 84);
  textAlign(CENTER, CENTER);
  textSize(10);
  text(label, x + w / 2, y + h / 2);
  addHitTarget(x, y, w, h, action);
}

function drawEnding() {
  const fadeDuration = 1700;
  const elapsed = millis() - endingStartedAt;
  if (endingState === "out") {
    if (mode === "guided") drawGuidedStudy(false);
    else drawArchiveView();
    const alpha = 255 * easeInOut(constrain(elapsed / fadeDuration, 0, 1));
    fill(0, alpha);
    noStroke();
    rect(0, 0, width, height);
    if (elapsed >= fadeDuration) {
      endingState = "question";
      endingStartedAt = millis();
    }
    return;
  }

  if (endingState === "in") {
    drawArchiveView();
    const alpha = 255 * (1 - easeInOut(constrain(elapsed / fadeDuration, 0, 1)));
    fill(0, alpha);
    noStroke();
    rect(0, 0, width, height);
    if (elapsed >= fadeDuration) endingState = "idle";
    return;
  }

  background(12);
  const questionAlpha = 255 * easeInOut(constrain(elapsed / 900, 0, 1));
  fill(237, questionAlpha);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(min(25, max(16, width / 34)));
  text(
    "What did you learn from the difference between human classification & machine classification?",
    width * 0.5,
    height * 0.44,
    min(width - 64, 760)
  );

  const buttonWidth = min(220, width - 48);
  const buttonHeight = 38;
  const buttonX = (width - buttonWidth) / 2;
  const buttonY = height * 0.61;
  const buttonAlpha = 255 * easeInOut(constrain((elapsed - 500) / 700, 0, 1));
  stroke(110, buttonAlpha);
  fill(17, buttonAlpha);
  rect(buttonX, buttonY, buttonWidth, buttonHeight);
  noStroke();
  fill(214, 255, 84, buttonAlpha);
  textAlign(CENTER, CENTER);
  textSize(10);
  text("RETURN TO HOMEPAGE  /  R", width / 2, buttonY + buttonHeight / 2);
  if (elapsed >= 500) {
    addHitTarget(buttonX, buttonY, buttonWidth, buttonHeight, returnToArchive);
  }
}

function drawArchiveView() {
  background(12);
  drawHeaderAndCarousel();
  drawWorkspaces();
  drawMenuBar();
}

function selectImage(index) {
  if (!images.some(entry => entry.index === index)) return;
  selectedImageIndex = index;
  visitedImages.add(index);
  taggingPrompt = false;
  ensureSelectedImageVisible();
  updateMachineMetadata();
}

function toggleTag(tag) {
  const selected = getSelectedImage();
  if (!selected) return;
  interactedImages.add(selected.index);
  visitedImages.add(selected.index);

  const tagIndex = selected.tags.indexOf(tag);
  if (tagIndex === -1) selected.tags.push(tag);
  else selected.tags.splice(tagIndex, 1);
}

function resetToLanding() {
  for (const entry of getAvailableImages()) entry.tags = [];
  visitedImages.clear();
  interactedImages.clear();
  guidedHistory = [];
  guidedRound = 0;
  guidedSelection = null;
  guidedChoices = [];
  guidedDeck = [];
  guidedSeen = new Set();
  selectedImageIndex = getAvailableImages()[0]?.index ?? 0;
  carouselStart = 0;
  gridScroll = 0;
  taggingPrompt = false;
  targetHumanLabelScale = 0;
  humanLabelScale = 0;
  endingState = "idle";
  previousMode = "landing";
  mode = "landing";
  transitionStartedAt = millis();
  updateMachineMetadata();
}

function enterMode(nextMode) {
  previousMode = mode;
  mode = nextMode;
  transitionStartedAt = millis();
  if (nextMode === "guided") startGuidedStudy();
  if (nextMode === "grid") gridScroll = 0;
}

function startGuidedStudy() {
  guidedRound = 0;
  guidedHistory = [];
  guidedSelection = null;
  guidedSeen = new Set();
  guidedDeck = shuffle([...getAvailableImages()]);
  prepareGuidedChoices();
}

function prepareGuidedChoices() {
  const choiceCount = constrain(floor(width / 260), 3, 6);
  guidedChoices = [];

  while (guidedChoices.length < choiceCount) {
    if (guidedDeck.length === 0) {
      // Refill only after the current random deck is exhausted. Clear the seen
      // set only if a very small loaded pool cannot fill the requested options.
      const remaining = getAvailableImages().filter(entry => !guidedSeen.has(entry.index));
      guidedDeck = shuffle(remaining.length >= choiceCount
        ? remaining
        : [...getAvailableImages()]);
      if (guidedDeck.length === 0) break;
    }

    const entry = guidedDeck.shift();
    if (!entry || guidedSeen.has(entry.index)) continue;
    guidedChoices.push(entry);
    guidedSeen.add(entry.index);
  }
  guidedSelection = null;
}

function submitGuidedSelection() {
  if (!guidedSelection) return;
  chooseGuidedImage(guidedSelection);
}

function chooseGuidedImage(entry) {
  selectedImageIndex = entry.index;
  visitedImages.add(entry.index);
  interactedImages.add(entry.index);
  guidedHistory.push(entry.index);
  guidedRound++;
  if (guidedRound < guidedPrompts.length) prepareGuidedChoices();
}

function drawModeTransition() {
  const elapsed = millis() - transitionStartedAt;
  if (elapsed >= 420) return;
  const alpha = 255 * sin(constrain(elapsed / 420, 0, 1) * PI);
  fill(0, alpha);
  noStroke();
  rect(0, 0, width, height);
}

function shuffleArchive() {
  if (images.length < 1) return;
  const next = images[floor(random(images.length))];
  selectedImageIndex = next.index;
  visitedImages.add(next.index);
  next.tags = [];
  taggingPrompt = false;
  ensureSelectedImageVisible();
  updateMachineMetadata();
}

function restartArchive() {
  for (const entry of getAvailableImages()) entry.tags = [];
  selectedImageIndex = getAvailableImages()[0]?.index ?? 0;
  carouselStart = 0;
  taggingPrompt = false;
  updateMachineMetadata();
}

function startEnding() {
  endingState = "out";
  endingStartedAt = millis();
  hitTargets = [];
}

function returnToArchive() {
  resetToLanding();
}

function updateMachineMetadata() {
  machineMetadata = {
    grayscale: floor(random(28, 87)),
    edge: floor(random(9, 63)),
    confidence: floor(random(61, 99)),
    label: random(["STRUCTURE / RUIN", "EMPTY SPACE", "DECAY / INTERIOR", "LOW HUMAN PRESENCE"])
  };
}

function getAvailableImages() {
  return images;
}

function getSelectedImage() {
  return images.find(entry => entry.index === selectedImageIndex);
}

function addHitTarget(x, y, targetWidth, targetHeight, action) {
  hitTargets.push({ x, y, width: targetWidth, height: targetHeight, action });
}

function mousePressed() {
  if (endingState !== "idle" && endingState !== "question") return false;
  for (let index = hitTargets.length - 1; index >= 0; index--) {
    const target = hitTargets[index];
    if (
      mouseX >= target.x &&
      mouseX <= target.x + target.width &&
      mouseY >= target.y &&
      mouseY <= target.y + target.height
    ) {
      target.action();
      return false;
    }
  }
}

function mouseWheel(event) {
  if (endingState !== "idle") return false;
  if (mode === "grid") {
    gridScroll += event.delta > 0 ? 48 : -48;
    gridScroll = constrain(gridScroll, 0, max(0, height + 239 * 120));
    return false;
  }
  const topHeight = getTopHeight();
  if (mouseY > 45 && mouseY < topHeight) {
    const available = getAvailableImages();
    const visible = getCarouselVisibleCount();
    carouselStart = constrain(carouselStart + (event.delta > 0 ? 1 : -1), 0, max(0, available.length - visible));
    return false;
  }

  const workspaceTop = topHeight;
  const menuTop = height - getMenuHeight();
  if (mouseX < width / 2 && mouseY > workspaceTop && mouseY < menuTop) {
    targetHumanLabelScale = constrain(
      targetHumanLabelScale + (event.delta > 0 ? 0.12 : -0.12),
      0,
      1
    );
    return false;
  }
}

function keyPressed() {
  if (mode === "grid" && (key === "Escape" || key === "Backspace")) {
    enterMode(previousMode === "explore" ? "explore" : "explore");
    return false;
  }
  if (endingState === "question" && (key === "r" || key === "R")) {
    returnToArchive();
    return false;
  }
}

function getCarouselVisibleCount() {
  return max(1, floor((width - 96) / 85));
}

function ensureSelectedImageVisible() {
  const available = getAvailableImages();
  const selectedPosition = available.findIndex(entry => entry.index === selectedImageIndex);
  const visible = getCarouselVisibleCount();
  if (selectedPosition < 0) return;

  if (selectedPosition < carouselStart) carouselStart = selectedPosition;
  else if (selectedPosition >= carouselStart + visible) {
    carouselStart = selectedPosition - visible + 1;
  }
}

function getTopHeight() {
  return min(188, max(151, height * 0.25));
}

function getMenuHeight() {
  return min(62, max(54, height * 0.1));
}

function easeInOut(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - pow(-2 * value + 2, 3) / 2;
}

function drawImageContain(source, x, y, targetWidth, targetHeight) {
  const scale = min(targetWidth / source.width, targetHeight / source.height);
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
  image(source, x + (targetWidth - drawWidth) / 2, y + (targetHeight - drawHeight) / 2, drawWidth, drawHeight);
}

function drawImageCover(source, x, y, targetWidth, targetHeight) {
  const sourceRatio = source.width / source.height;
  const targetRatio = targetWidth / targetHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = source.width;
  let sourceHeight = source.height;

  if (sourceRatio > targetRatio) {
    sourceWidth = source.height * targetRatio;
    sourceX = (source.width - sourceWidth) / 2;
  } else {
    sourceHeight = source.width / targetRatio;
    sourceY = (source.height - sourceHeight) / 2;
  }

  image(source, x, y, targetWidth, targetHeight, sourceX, sourceY, sourceWidth, sourceHeight);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
