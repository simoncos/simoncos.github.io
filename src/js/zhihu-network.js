"use strict";
(() => {
  // src/ts/network/renderer.ts
  function createNetworkRenderer(ctx, stage, canvas, controls) {
    const { mode, selected, t, format, nameAt } = controls;
    let width = 0, height = 0;
    function point(node) {
      const { zoom, pan } = controls.view();
      const size = Math.min(width, height) * 0.94;
      return {
        x: (width / 2 + (node[0] - 0.5) * size - width / 2) * zoom + width / 2 + pan.x,
        y: (height / 2 + (node[1] - 0.5) * size - height / 2) * zoom + height / 2 + pan.y
      };
    }
    function line(a, b, arrow = false) {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      if (arrow) {
        const angle = Math.atan2(b.y - a.y, b.x - a.x), inset = 10;
        const x = b.x - Math.cos(angle) * inset, y = b.y - Math.sin(angle) * inset;
        ctx.moveTo(x - 7 * Math.cos(angle - 0.4), y - 7 * Math.sin(angle - 0.4));
        ctx.lineTo(x, y);
        ctx.lineTo(x - 7 * Math.cos(angle + 0.4), y - 7 * Math.sin(angle + 0.4));
      }
    }
    function text(value, x, y, size = 12) {
      ctx.font = `${size}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#111d2b";
      ctx.strokeText(value, x, y);
      ctx.fillStyle = "#edf3f7";
      ctx.fillText(value, x, y);
    }
    function groupView(data) {
      const centers = data.groups.map((group) => {
        const rows = data.nodes.filter((row) => row[2] === group.id);
        const x = rows.reduce((sum, row) => sum + row[0], 0) / rows.length;
        const y = rows.reduce((sum, row) => sum + row[1], 0) / rows.length;
        return point([x, y, group.id, 0, 0]);
      });
      const maximum = Math.max(...data.group_links.flat());
      for (let a = 0; a < centers.length; a++) for (let b = a + 1; b < centers.length; b++) {
        const count = data.group_links[a][b] + data.group_links[b][a];
        if (!count) continue;
        const aa = centers[a], bb = centers[b], dx = bb.x - aa.x, dy = bb.y - aa.y;
        const distance = Math.max(Math.hypot(dx, dy), 1), bend = 22;
        const mid = { x: (aa.x + bb.x) / 2 - dy / distance * bend, y: (aa.y + bb.y) / 2 + dx / distance * bend };
        ctx.beginPath();
        ctx.moveTo(aa.x, aa.y);
        ctx.quadraticCurveTo(mid.x, mid.y, bb.x, bb.y);
        ctx.strokeStyle = "#6d91a6";
        ctx.lineWidth = 0.8 + 9 * Math.sqrt(count / (2 * maximum));
        ctx.globalAlpha = 0.65;
        ctx.stroke();
        ctx.globalAlpha = 1;
        text(format(count), (aa.x + 2 * mid.x + bb.x) / 4, (aa.y + 2 * mid.y + bb.y) / 4, width < 500 ? 9 : 12);
      }
      data.groups.forEach((group, i) => {
        const p = centers[i], radius = (width < 500 ? 42 : 74) * Math.sqrt(group.size / data.groups[0].size);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = group.color;
        ctx.fill();
        ctx.strokeStyle = "#111d2b";
        ctx.lineWidth = 3;
        ctx.stroke();
        if (radius < 25) {
          text(t("G", "组 ") + (i + 1) + " · " + format(group.size), p.x, p.y + radius + 17, 10);
        } else {
          ctx.textAlign = "center";
          ctx.fillStyle = "#111d2b";
          ctx.font = `600 ${width < 500 ? 11 : 15}px sans-serif`;
          ctx.fillText(t(width < 500 ? "G" : "Group ", "组 ") + (i + 1), p.x, p.y - 4);
          ctx.font = `${width < 500 ? 10 : 13}px ui-monospace, monospace`;
          ctx.fillText(format(group.size), p.x, p.y + 15);
        }
      });
    }
    function draw() {
      const data = controls.network();
      const { zoom } = controls.view();
      const { incoming, outgoing, reciprocal } = controls.index();
      if (!data) return;
      width = stage.clientWidth;
      height = canvas.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (mode() === "groups") {
        groupView(data);
        return;
      }
      const current = selected(), focus = current >= 0 && current < data.nodes.length;
      const points = data.nodes.map(point);
      const links = mode() === "mutual" ? reciprocal : data.edges;
      const stride = Math.max(1, Math.ceil(links.length / 2 / 12e3));
      const paths = data.groups.map(() => new Path2D()), external = new Path2D();
      for (let i = 0; i < links.length; i += 2 * stride) {
        const a = links[i], b = links[i + 1], path = data.nodes[a][2] === data.nodes[b][2] ? paths[data.nodes[a][2]] : external;
        path.moveTo(points[a].x, points[a].y);
        path.lineTo(points[b].x, points[b].y);
      }
      ctx.lineWidth = 0.75;
      ctx.globalAlpha = focus ? 0.035 : 0.22;
      paths.forEach((path, i) => {
        ctx.strokeStyle = data.groups[i].color;
        ctx.stroke(path);
      });
      ctx.strokeStyle = "#829fb4";
      ctx.globalAlpha = focus ? 0.025 : 0.21;
      ctx.stroke(external);
      ctx.globalAlpha = 1;
      const neighbours = focus ? /* @__PURE__ */ new Set([...incoming[current], ...outgoing[current]]) : /* @__PURE__ */ new Set();
      if (focus) {
        neighbours.forEach((id) => {
          const isIn = incoming[current].has(id), isOut = outgoing[current].has(id);
          ctx.strokeStyle = isIn && isOut ? "#e6cc78" : isIn ? "#71c9de" : "#f39178";
          ctx.lineWidth = 1.25;
          ctx.globalAlpha = 0.65;
          ctx.beginPath();
          line(isIn ? points[id] : points[current], isIn ? points[current] : points[id], true);
          if (isIn && isOut) line(points[current], points[id], true);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }
      const maximum = data.nodes[0][3];
      for (let i = data.nodes.length - 1; i >= 0; i--) {
        const node = data.nodes[i], p = points[i];
        if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) continue;
        ctx.globalAlpha = focus && i !== current && !neighbours.has(i) ? 0.17 : 1;
        const radius = (data.node_count > 500 ? 1.3 : 2) + Math.sqrt(node[3] / maximum) * 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * Math.sqrt(zoom), 0, Math.PI * 2);
        ctx.fillStyle = data.groups[node[2]].color;
        ctx.fill();
        ctx.strokeStyle = "#111d2b";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (focus) {
        const p = points[current];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 13 * Math.sqrt(zoom), 0, Math.PI * 2);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        text(nameAt(current) || "#" + String(current + 1).padStart(3, "0"), p.x, p.y - 20 * Math.sqrt(zoom));
      } else [0, 1, 2].forEach((id) => text(nameAt(id) || "#" + String(id + 1).padStart(3, "0"), points[id].x, points[id].y - 13, 10));
    }
    return { draw, point, get width() {
      return width;
    }, get height() {
      return height;
    } };
  }

  // src/ts/lib/data.ts
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  // src/ts/network/data.ts
  function parseNetwork(value, cohort) {
    if (!isRecord(value) || value.cohort !== cohort || !Number.isInteger(value.node_count) || !Number.isInteger(value.edge_count) || !finite(value.reciprocal_pairs) || !Array.isArray(value.nodes) || !Array.isArray(value.edges) || !Array.isArray(value.groups) || !Array.isArray(value.group_links) || !isRecord(value.anchors)) throw new Error("Invalid network");
    const count = value.node_count;
    const groups = value.groups;
    if (count <= 0 || value.nodes.length !== count || value.edges.length !== Number(value.edge_count) * 2 || !groups.length) throw new Error("Invalid network counts");
    if (!groups.every((group, i) => isRecord(group) && group.id === i && finite(group.size) && group.size > 0 && typeof group.color === "string")) throw new Error("Invalid network groups");
    if (!value.nodes.every((node) => Array.isArray(node) && node.length === 5 && node.every(finite) && Number.isInteger(node[2]) && node[2] >= 0 && node[2] < groups.length)) throw new Error("Invalid network nodes");
    if (!value.edges.every((id) => Number.isInteger(id) && id >= 0 && id < count) || !Object.values(value.anchors).every((id) => finite(id) && Number.isInteger(id) && id >= 1 && id <= count)) throw new Error("Invalid network IDs");
    if (value.group_links.length !== groups.length || !value.group_links.every((row) => Array.isArray(row) && row.length === groups.length && row.every(finite))) throw new Error("Invalid network group links");
    return value;
  }
  function indexNetwork(data) {
    const incoming = data.nodes.map(() => /* @__PURE__ */ new Set()), outgoing = data.nodes.map(() => /* @__PURE__ */ new Set());
    for (let i = 0; i < data.edges.length; i += 2) {
      const a = data.edges[i], b = data.edges[i + 1];
      outgoing[a].add(b);
      incoming[b].add(a);
    }
    const reciprocal = [];
    outgoing.forEach((rows, a) => rows.forEach((b) => {
      if (a < b && outgoing[b].has(a)) reciprocal.push(a, b);
    }));
    return { incoming, outgoing, reciprocal };
  }

  // src/ts/lib/dom.ts
  function required(value, name) {
    if (value == null) throw new Error(`Missing required element or value: ${name}`);
    return value;
  }

  // src/ts/zhihu-network.ts
  (function() {
    const rootCandidate = document.querySelector(".zr-main");
    const readerCandidate = document.querySelector(".zr-network-reader");
    const stageCandidate = document.querySelector(".zr-network-stage");
    const canvasCandidate = document.querySelector("#zr-network-canvas");
    const ctxCandidate = canvasCandidate?.getContext("2d");
    if (!rootCandidate || !readerCandidate || !stageCandidate || !canvasCandidate || !ctxCandidate) return;
    const root = rootCandidate;
    const reader = readerCandidate;
    const stage = stageCandidate;
    const canvas = canvasCandidate;
    const ctx = ctxCandidate;
    const t = (en, zh) => window.SITE_SHELL?.lang === "zh" ? zh : en;
    const format = (value) => value.toLocaleString("en-US");
    const numberInput = required(document.querySelector("#zr-node-number"), "'#zr-node-number'");
    const anchorSelect = required(document.querySelector("#zr-network-anchor"), "'#zr-network-anchor'");
    const caches = /* @__PURE__ */ new Map();
    let network = null;
    let incoming = [], outgoing = [], reciprocal = [];
    let zoom = 1, pan = { x: 0, y: 0 }, request = 0, cohort = "", lastView = "", lastNode = "";
    let drag = null;
    const selected = () => Number(root.dataset.graphNode || 0) - 1;
    const mode = () => root.dataset.graphView || "mutual";
    const nameAt = (id) => {
      const data = network;
      return data && Object.keys(data.anchors).find((name) => data.anchors[name] === id + 1);
    };
    function change(detail) {
      root.dispatchEvent(new CustomEvent("zrnetworkchange", { detail: { ...detail, ...detail.node ? { person: nameAt(Number(detail.node) - 1) || "" } : {}, ...detail.node && mode() !== "all" ? { view: "all" } : {} } }));
    }
    function bringGraph() {
      canvas.focus({ preventScroll: true });
      stage.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
    const renderer = createNetworkRenderer(ctx, stage, canvas, { network: () => network, view: () => ({ zoom, pan }), index: () => ({ incoming, outgoing, reciprocal }), mode, selected, t, format, nameAt });
    const { draw, point } = renderer;
    function updateInspector() {
      if (!network) return;
      const current = selected(), focus = current >= 0 && current < network.node_count && mode() !== "groups";
      const title = required(document.getElementById("zr-node-title"), "'zr-node-title'"), description = required(document.getElementById("zr-node-description"), "'zr-node-description'"), stats = required(document.getElementById("zr-node-stats"), "'zr-node-stats'");
      title.textContent = focus ? nameAt(current) || t("User #", "节点 #") + String(current + 1).padStart(3, "0") : mode() === "groups" ? t("Connections between groups", "分组怎样相连？") : t("Who connects to whom?", "谁和谁相连？");
      description.textContent = focus ? t("All incoming and outgoing connections of this user, inside the selected network.", "这个节点在所选网络内的全部关注与被关注连接。") : mode() === "groups" ? t("Each circle gathers a structural group. Circle area represents users; lines count following links in both directions. Internal links stay inside the circles.", "每个圆汇总一个结构分组。圆的面积表示人数；连线数字为两个方向的关注总数。组内连接未画在组间。") : t("Each dot is a user. Start with a published name or a number to explore their neighbours.", "每个点是一名用户。从原文人物或编号出发，查看他的连接。");
      const values = focus ? [[t("Followed by", "被关注"), network.nodes[current][3]], [t("Following", "关注"), network.nodes[current][4]], [t("Mutual neighbours", "互相关注"), [...incoming[current]].filter((i) => outgoing[current].has(i)).length]] : [[t("Users", "用户"), network.node_count], [t("Following links", "关注连接"), network.edge_count], [t("Mutual pairs", "互相关注对"), network.reciprocal_pairs]];
      stats.replaceChildren(...values.map(([label, value]) => {
        const row = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
        dt.textContent = String(label);
        dd.textContent = format(Number(value));
        row.append(dt, dd);
        return row;
      }));
      const key = required(document.getElementById("zr-network-key"), "'zr-network-key'");
      const entries = focus ? [["#71c9de", t("Follows this user", "关注这个节点")], ["#f39178", t("Followed by this user", "这个节点关注")], ["#e6cc78", t("Follows both ways", "双方互相关注")]] : network.groups.map((g, i) => [g.color, t("Group ", "分组 ") + (i + 1) + " · " + format(g.size)]);
      key.replaceChildren(...entries.map(([color, label]) => {
        const row = document.createElement("span"), dot = document.createElement("i");
        dot.style.backgroundColor = color;
        row.append(dot, document.createTextNode(label));
        return row;
      }));
      numberInput.max = String(network.node_count);
      numberInput.placeholder = "1–" + network.node_count;
      numberInput.value = focus ? String(current + 1) : "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.disabled = true;
      placeholder.textContent = t("Choose a published name…", "选择原文人物…");
      anchorSelect.replaceChildren(placeholder, ...Object.keys(network.anchors).map((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        return option;
      }));
      anchorSelect.value = focus ? nameAt(current) || "" : "";
      const person = document.querySelector("#zr-person")?.value;
      const openPerson = required(document.querySelector("[data-open-network-person]"), "'[data-open-network-person]'");
      openPerson.hidden = !person || !network.anchors[person];
      openPerson.textContent = t("Explore " + person + " in the network", "查看" + person + "的关注网络") + " ↗";
      required(document.getElementById("zr-graph-count"), "'zr-graph-count'").textContent = network.cohort + " · " + format(network.node_count) + t(" users · ", " 名用户 · ") + format(network.edge_count) + t(" directed links", " 条有向连接");
      required(document.getElementById("zr-graph-hint"), "'zr-graph-hint'").textContent = focus ? t("Complete neighbourhood · arrowheads show direction", "完整邻居 · 箭头表示方向") : mode() === "groups" ? t("Circle = group · line = between-group links", "圆 = 分组 · 线 = 组间连接") : t("Tap a dot to follow its connections", "点一个节点，沿连接看进去");
      const count = mode() === "mutual" ? network.reciprocal_pairs : network.edge_count;
      const stride = Math.max(1, Math.ceil(count / 12e3)), drawn = Math.ceil(count / stride);
      required(document.getElementById("zr-network-status"), "'zr-network-status'").textContent = mode() === "groups" ? t("Groups are computed, not named social communities.", "分组由算法计算，不是已命名的真实社群。") : focus ? t("Complete neighbourhood; overview ink is subdued.", "完整显示邻居，背景概览已淡化。") : t("Overview: ", "概览绘制 ") + format(drawn) + t(" real links/pairs. Select a dot for every connection.", " 条真实连线。选中节点后显示全部连接。");
      const valuesDisclosure = required(root.querySelector("[data-group-values]"), "'[data-group-values]'");
      valuesDisclosure.hidden = mode() !== "groups";
      if (mode() === "groups") {
        const table = document.createElement("table"), caption = document.createElement("caption");
        caption.textContent = t("Row follows column. Diagonal cells count internal links.", "行关注列。对角线为组内连接。");
        table.append(caption);
        const head = document.createElement("tr");
        [t("From / to", "从 / 到"), ...network.groups.map((_, i) => t("Group ", "组 ") + (i + 1))].forEach((label) => {
          const th = document.createElement("th");
          th.scope = "col";
          th.textContent = label;
          head.append(th);
        });
        const thead = document.createElement("thead");
        thead.append(head);
        table.append(thead);
        const tbody = document.createElement("tbody");
        network.group_links.forEach((values2, i) => {
          const row = document.createElement("tr"), th = document.createElement("th");
          th.scope = "row";
          th.textContent = t("Group ", "组 ") + (i + 1);
          row.append(th);
          values2.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = format(value);
            row.append(cell);
          });
          tbody.append(row);
        });
        table.append(tbody);
        required(document.getElementById("zr-group-table"), "'zr-group-table'").replaceChildren(table);
      }
    }
    async function update() {
      const next = root.dataset.graphCohort || "Net50k";
      if (mode() !== lastView) {
        zoom = 1;
        pan = { x: 0, y: 0 };
        lastView = mode();
      }
      if (root.dataset.graphNode !== lastNode) {
        lastNode = root.dataset.graphNode || "";
        if (zoom > 1 && network) scale(1);
      }
      if (next === cohort && network) {
        updateInspector();
        draw();
        return;
      }
      const token = ++request;
      cohort = next;
      network = null;
      zoom = 1;
      pan = { x: 0, y: 0 };
      reader.classList.remove("zr-network-loaded");
      reader.querySelectorAll("[data-graph-fallback]").forEach((el) => el.hidden = el.dataset.graphFallback !== next);
      required(document.getElementById("zr-node-stats"), "'zr-node-stats'").replaceChildren();
      required(document.getElementById("zr-node-title"), "'zr-node-title'").textContent = t("Archived network", "归档网络");
      required(document.getElementById("zr-node-description"), "'zr-node-description'").textContent = t("Reading interactive data; the static overview remains visible.", "交互数据读取中，静态概览仍可阅读。");
      required(document.getElementById("zr-network-key"), "'zr-network-key'").replaceChildren();
      required(document.querySelector("[data-open-network-person]"), "'[data-open-network-person]'").hidden = true;
      required(document.getElementById("zr-network-status"), "'zr-network-status'").textContent = t("Loading the archived network…", "正在读取归档网络…");
      if (!caches.has(next)) caches.set(next, fetch(`assets/zhihu-${next.toLowerCase()}.json?v=20261001b`).then(async (response) => {
        if (!response.ok) throw new Error("Network unavailable");
        const data = parseNetwork(await response.json(), next);
        if (data.cohort !== next || data.nodes.length !== data.node_count || data.edges.length !== data.edge_count * 2) throw new Error("Invalid network");
        return data;
      }));
      try {
        const data = await required(caches.get(next), "network request");
        if (token !== request) return;
        network = data;
        ({ incoming, outgoing, reciprocal } = indexNetwork(data));
        reader.classList.add("zr-network-loaded");
        updateInspector();
        draw();
      } catch (_) {
        if (token !== request) return;
        caches.delete(next);
        required(document.getElementById("zr-node-description"), "'zr-node-description'").textContent = t("Read the static overview, or switch to the other network.", "可阅读静态图，或切换另一张网络。");
        required(document.getElementById("zr-network-status"), "'zr-network-status'").textContent = t("Interactive data unavailable. The real static network remains visible.", "交互数据暂时不可用，仍可阅读真实网络的静态图。");
      }
    }
    function scale(delta) {
      zoom = Math.max(1, Math.min(4, zoom * delta));
      const current = selected();
      if (zoom === 1) {
        pan = { x: 0, y: 0 };
      } else if (current >= 0 && network) {
        const n = network.nodes[current], size = Math.min(renderer.width, renderer.height) * 0.94;
        pan = { x: -(n[0] - 0.5) * size * zoom, y: -(n[1] - 0.5) * size * zoom };
      }
      draw();
    }
    document.getElementById("zr-node-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!network || !numberInput.reportValidity()) return;
      const value = Number(numberInput.value);
      if (Number.isInteger(value) && value >= 1 && value <= network.node_count) {
        change({ node: String(value) });
        bringGraph();
      }
    });
    anchorSelect?.addEventListener("change", () => {
      const id = network?.anchors[anchorSelect.value];
      if (id) {
        change({ node: String(id) });
        bringGraph();
      }
    });
    document.querySelector("[data-open-network-person]")?.addEventListener("click", () => {
      const person = document.querySelector("#zr-person")?.value;
      const id = network?.anchors[person || ""];
      if (id) {
        change({ node: String(id) });
        bringGraph();
      }
    });
    root.querySelector("[data-clear-node]")?.addEventListener("click", () => {
      zoom = 1;
      pan = { x: 0, y: 0 };
      change({ node: "" });
      bringGraph();
    });
    root.querySelectorAll("[data-graph-tool]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.graphTool === "reset") {
        zoom = 1;
        pan = { x: 0, y: 0 };
        draw();
      } else scale(button.dataset.graphTool === "in" ? 1.4 : 1 / 1.4);
    }));
    canvas.addEventListener("pointerdown", (event) => {
      drag = { x: event.clientX, y: event.clientY, moved: false, panX: pan.x, panY: pan.y, mouse: event.pointerType === "mouse" };
      if (drag.mouse && zoom > 1) canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      drag.moved || (drag.moved = Math.hypot(dx, dy) > 6);
      if (drag.mouse && zoom > 1) {
        pan = { x: drag.panX + dx, y: drag.panY + dy };
        draw();
      }
    });
    canvas.addEventListener("pointerup", (event) => {
      const was = drag;
      drag = null;
      if (!was || was.moved || !network || mode() === "groups") return;
      const box = canvas.getBoundingClientRect(), x = event.clientX - box.left, y = event.clientY - box.top;
      let nearest = -1, distance = 22;
      network.nodes.forEach((node, i) => {
        const p = point(node), d = Math.hypot(p.x - x, p.y - y);
        if (d < distance) {
          nearest = i;
          distance = d;
        }
      });
      if (nearest >= 0) change({ node: String(nearest + 1) });
    });
    canvas.addEventListener("pointercancel", () => drag = null);
    canvas.addEventListener("lostpointercapture", () => drag = null);
    canvas.addEventListener("keydown", (event) => {
      if (!network) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const step = event.key === "ArrowRight" ? 1 : -1, current = selected();
        const next = current < 0 ? step > 0 ? 0 : network.node_count - 1 : (current + step + network.node_count) % network.node_count;
        change({ node: String(next + 1) });
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        scale(1.4);
      } else if (event.key === "-") {
        event.preventDefault();
        scale(1 / 1.4);
      } else if (event.key === "Escape") {
        event.preventDefault();
        zoom = 1;
        pan = { x: 0, y: 0 };
        change({ node: "" });
      }
    });
    root.addEventListener("zrstate", () => void update());
    new ResizeObserver(() => draw()).observe(stage);
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void update();
      }, { rootMargin: "200px 0px" });
      observer.observe(reader);
    } else void update();
  })();
})();
