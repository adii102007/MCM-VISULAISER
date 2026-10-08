/* =========================================================
   RECURSION LAB
   ---------------------------------------------------------
   The important idea:

   1. Generate an actual execution trace.
   2. Do NOT immediately display the whole trace.
   3. Reveal one event at a time.
   4. Every event updates:
      - recursion tree
      - arrows
      - call stack
      - metrics
      - explanation
      - DP state
   ========================================================= */


/* =========================================================
   GLOBAL STATE
   ========================================================= */

const state = {

    problem: "fib",
    approach: "normal",

    trace: [],
    cursor: 0,

    running: false,
    timer: null,

    speed: 1,

    nodes: new Map(),
    edges: [],

    stack: [],

    calls: 0,
    hits: 0,
    maxStack: 0,

    solvedStates: new Set(),

    result: null
};


const comparison = {

    traceA: [],
    traceB: [],

    cursor: 0,

    running: false,
    timer: null,

    nodesA: new Map(),
    nodesB: new Map(),

    firstDifference: null
};


/* =========================================================
   DOM
   ========================================================= */

const problemSelect = document.getElementById("problemSelect");

const fibInput = document.getElementById("fibInput");
const knapsackInput = document.getElementById("knapsackInput");
const queenInput = document.getElementById("queenInput");

const fibInputGroup = document.getElementById("fibInputGroup");
const knapsackInputGroup = document.getElementById("knapsackInputGroup");
const queenInputGroup = document.getElementById("queenInputGroup");

const approachSelect = document.getElementById("approachSelect");

const playBtn = document.getElementById("playBtn");
const stepBtn = document.getElementById("stepBtn");
const resetBtn = document.getElementById("resetBtn");

const slowBtn = document.getElementById("slowBtn");
const fastBtn = document.getElementById("fastBtn");
const speedLabel = document.getElementById("speedLabel");

const treeTitle = document.getElementById("treeTitle");
const runBadge = document.getElementById("runBadge");

const treeViewport = document.getElementById("treeViewport");
const treeSvg = document.getElementById("treeSvg");
const edgeLayer = document.getElementById("edgeLayer");
const treeNodes = document.getElementById("treeNodes");
const emptyTree = document.getElementById("emptyTree");

const stackList = document.getElementById("stackList");
const stackDepth = document.getElementById("stackDepth");

const currentAction = document.getElementById("currentAction");

const metricCalls = document.getElementById("metricCalls");
const metricStates = document.getElementById("metricStates");
const metricHits = document.getElementById("metricHits");
const metricStack = document.getElementById("metricStack");
const metricResult = document.getElementById("metricResult");

const dpPanel = document.getElementById("dpPanel");
const dpTitle = document.getElementById("dpTitle");
const dpDescription = document.getElementById("dpDescription");
const dpMethod = document.getElementById("dpMethod");
const memoStates = document.getElementById("memoStates");
const tableContainer = document.getElementById("tableContainer");

const globalStatus = document.getElementById("globalStatus");

const whyTitle = document.getElementById("whyTitle");
const whyText = document.getElementById("whyText");
const complexityTime = document.getElementById("complexityTime");
const complexitySpace = document.getElementById("complexitySpace");


/* comparison DOM */

const compareA = document.getElementById("compareA");
const compareB = document.getElementById("compareB");
const compareBtn = document.getElementById("compareBtn");
const compareStepBtn = document.getElementById("compareStepBtn");

const compareTitleA = document.getElementById("compareTitleA");
const compareTitleB = document.getElementById("compareTitleB");

const compareProgressA = document.getElementById("compareProgressA");
const compareProgressB = document.getElementById("compareProgressB");

const compareTreeA = document.getElementById("compareTreeA");
const compareTreeB = document.getElementById("compareTreeB");

const compareEdgesA = document.getElementById("compareEdgesA");
const compareEdgesB = document.getElementById("compareEdgesB");

const compareNodesA = document.getElementById("compareNodesA");
const compareNodesB = document.getElementById("compareNodesB");

const differenceBanner = document.getElementById("differenceBanner");
const differenceNumber = document.getElementById("differenceNumber");
const differenceTitle = document.getElementById("differenceTitle");
const differenceText = document.getElementById("differenceText");

const detailTitle = document.getElementById("detailTitle");
const detailText = document.getElementById("detailText");


/* =========================================================
   PROBLEM DATA
   ========================================================= */

const KNAPSACK_DATA = {

    small: {
        weights: [1, 3, 4],
        values: [3, 4, 5],
        capacity: 6
    },

    medium: {
        weights: [1, 2, 3, 4],
        values: [1, 4, 5, 7],
        capacity: 7
    },

    large: {
        weights: [1, 2, 3, 4, 5],
        values: [1, 4, 5, 7, 8],
        capacity: 9
    }
};


/* =========================================================
   UTILITY
   ========================================================= */

function delayFromSpeed() {

    const values = {
        0.5: 1000,
        1: 650,
        1.5: 400,
        2: 220
    };

    return values[state.speed] || 650;
}


function methodName(method) {

    return {

        normal: "Normal Recursion",

        backtracking: "Backtracking",

        memo: "Memoization",

        tabulation: "Tabulation"

    }[method];
}


function currentInput() {

    if (state.problem === "fib") {

        return Number(fibInput.value);

    }

    if (state.problem === "knapsack") {

        return KNAPSACK_DATA[knapsackInput.value];

    }

    return Number(queenInput.value);
}


/* =========================================================
   TRACE EVENT FORMAT

   enter
   exit
   cache
   decision
   backtrack
   table
   ========================================================= */


/* =========================================================
   FIBONACCI — NORMAL RECURSION
   ========================================================= */

function buildFibNormal(n) {

    const trace = [];

    let idCounter = 0;

    function solve(x, parentId = null, depth = 0) {

        const id = ++idCounter;

        trace.push({
            type: "enter",
            id,
            parentId,
            depth,
            key: `F(${x})`,
            label: `F(${x})`,
            value: null
        });

        if (x <= 1) {

            trace.push({
                type: "exit",
                id,
                depth,
                value: x,
                message: `Base case: F(${x}) = ${x}`
            });

            return x;
        }

        const left = solve(x - 1, id, depth + 1);
        const right = solve(x - 2, id, depth + 1);

        const result = left + right;

        trace.push({
            type: "exit",
            id,
            depth,
            value: result,
            message: `Return F(${x}) = ${result}`
        });

        return result;
    }

    const result = solve(n);

    trace.push({
        type: "finish",
        result
    });

    return trace;
}


/* =========================================================
   FIBONACCI — MEMOIZATION
   ========================================================= */

function buildFibMemo(n) {

    const trace = [];

    const memo = {};

    let idCounter = 0;

    function solve(x, parentId = null, depth = 0) {

        const id = ++idCounter;

        if (memo[x] !== undefined) {

            trace.push({
                type: "enter",
                id,
                parentId,
                depth,
                key: `F(${x})`,
                label: `F(${x})`,
                value: memo[x],
                reused: true
            });

            trace.push({
                type: "cache",
                id,
                key: `F(${x})`,
                value: memo[x],
                message:
                    `Cache hit: F(${x}) was already solved. Reusing ${memo[x]}.`
            });

            return memo[x];
        }

        trace.push({
            type: "enter",
            id,
            parentId,
            depth,
            key: `F(${x})`,
            label: `F(${x})`,
            value: null
        });

        if (x <= 1) {

            memo[x] = x;

            trace.push({
                type: "exit",
                id,
                depth,
                value: x,
                save: true,
                message:
                    `Base case saved: F(${x}) = ${x}.`
            });

            return x;
        }

        const left = solve(x - 1, id, depth + 1);
        const right = solve(x - 2, id, depth + 1);

        memo[x] = left + right;

        trace.push({
            type: "exit",
            id,
            depth,
            value: memo[x],
            save: true,
            message:
                `Solved and saved F(${x}) = ${memo[x]}.`
        });

        return memo[x];
    }

    const result = solve(n);

    trace.push({
        type: "finish",
        result
    });

    return trace;
}


/* =========================================================
   KNAPSACK — NORMAL RECURSION
   ========================================================= */

function buildKnapsackNormal(data) {

    const trace = [];

    let idCounter = 0;

    const weights = data.weights;
    const values = data.values;

    function solve(i, capacity, parentId = null, depth = 0) {

        const id = ++idCounter;

        const key = `K(${i},${capacity})`;

        trace.push({
            type: "enter",
            id,
            parentId,
            depth,
            key,
            label: key
        });

        if (i === 0 || capacity === 0) {

            trace.push({
                type: "exit",
                id,
                depth,
                value: 0,
                message: `Base state ${key} = 0`
            });

            return 0;
        }

        if (weights[i - 1] > capacity) {

            const result =
                solve(
                    i - 1,
                    capacity,
                    id,
                    depth + 1
                );

            trace.push({
                type: "exit",
                id,
                depth,
                value: result,
                message:
                    `Item ${i} is too heavy. Skip it.`
            });

            return result;
        }

        trace.push({
            type: "decision",
            id,
            message:
                `Decision at ${key}: include item ${i} or exclude it.`
        });

        const include =
            values[i - 1] +
            solve(
                i - 1,
                capacity - weights[i - 1],
                id,
                depth + 1
            );

        const exclude =
            solve(
                i - 1,
                capacity,
                id,
                depth + 1
            );

        const result = Math.max(include, exclude);

        trace.push({
            type: "exit",
            id,
            depth,
            value: result,
            message:
                `Best result for ${key} = ${result}`
        });

        return result;
    }

    const result =
        solve(
            weights.length,
            data.capacity
        );

    trace.push({
        type: "finish",
        result
    });

    return trace;
}


/* =========================================================
   KNAPSACK — MEMOIZATION
   ========================================================= */

function buildKnapsackMemo(data) {

    const trace = [];

    const memo = {};

    let idCounter = 0;

    const weights = data.weights;
    const values = data.values;

    function solve(i, capacity, parentId = null, depth = 0) {

        const key = `K(${i},${capacity})`;

        const id = ++idCounter;

        if (memo[key] !== undefined) {

            trace.push({
                type: "enter",
                id,
                parentId,
                depth,
                key,
                label: key,
                value: memo[key],
                reused: true
            });

            trace.push({
                type: "cache",
                id,
                key,
                value: memo[key],
                message:
                    `Cache hit: state ${key} was already solved. Reusing ${memo[key]}.`
            });

            return memo[key];
        }

        trace.push({
            type: "enter",
            id,
            parentId,
            depth,
            key,
            label: key
        });

        if (i === 0 || capacity === 0) {

            memo[key] = 0;

            trace.push({
                type: "exit",
                id,
                depth,
                value: 0,
                save: true,
                message:
                    `Base state saved: ${key} = 0.`
            });

            return 0;
        }

        if (weights[i - 1] > capacity) {

            const result =
                solve(
                    i - 1,
                    capacity,
                    id,
                    depth + 1
                );

            memo[key] = result;

            trace.push({
                type: "exit",
                id,
                depth,
                value: result,
                save: true,
                message:
                    `Saved ${key} = ${result}.`
            });

            return result;
        }

        trace.push({
            type: "decision",
            id,
            message:
                `Decision at ${key}: include or exclude item ${i}.`
        });

        const include =
            values[i - 1] +
            solve(
                i - 1,
                capacity - weights[i - 1],
                id,
                depth + 1
            );

        const exclude =
            solve(
                i - 1,
                capacity,
                id,
                depth + 1
            );

        memo[key] = Math.max(include, exclude);

        trace.push({
            type: "exit",
            id,
            depth,
            value: memo[key],
            save: true,
            message:
                `Saved ${key} = ${memo[key]}.`
        });

        return memo[key];
    }

    const result =
        solve(
            weights.length,
            data.capacity
        );

    trace.push({
        type: "finish",
        result
    });

    return trace;
}


/* =========================================================
   KNAPSACK — BACKTRACKING

   This deliberately shows:

   DECISION
       ↓
   CHOOSE
       ↓
   EXPLORE
       ↓
   UNDO
       ↓
   NEXT BRANCH
   ========================================================= */

function buildKnapsackBacktracking(data) {

    const trace = [];

    let idCounter = 0;

    const weights = data.weights;
    const values = data.values;

    let best = 0;

    function solve(
        index,
        capacity,
        currentValue,
        parentId = null,
        depth = 0
    ) {

        const id = ++idCounter;

        const key =
            `K(${index},${capacity})`;

        trace.push({
            type: "enter",
            id,
            parentId,
            depth,
            key,
            label: key,
            value: currentValue
        });

        if (
            index === weights.length ||
            capacity === 0
        ) {

            best = Math.max(best, currentValue);

            trace.push({
                type: "exit",
                id,
                depth,
                value: currentValue,
                message:
                    `Leaf reached. Best = ${best}`
            });

            return;
        }

        /* INCLUDE */

        if (weights[index] <= capacity) {

            trace.push({
                type: "decision",
                id,
                message:
                    `Choose item ${index + 1}.`
            });

            trace.push({
                type: "choose",
                id,
                message:
                    `Include item ${index + 1}.`
            });

            solve(
                index + 1,
                capacity - weights[index],
                currentValue + values[index],
                id,
                depth + 1
            );

            trace.push({
                type: "backtrack",
                id,
                message:
                    `Undo item ${index + 1}. Backtrack.`
            });
        }

        /* EXCLUDE */

        trace.push({
            type: "decision",
            id,
            message:
                `Try excluding item ${index + 1}.`
        });

        solve(
            index + 1,
            capacity,
            currentValue,
            id,
            depth + 1
        );

        trace.push({
            type: "exit",
            id,
            depth,
            value: best,
            message:
                `Return from K(${index},${capacity}).`
        });
    }

    solve(
        0,
        data.capacity,
        0
    );

    trace.push({
        type: "finish",
        result: best
    });

    return trace;
}


/* =========================================================
   N QUEENS — BACKTRACKING
   ========================================================= */

function buildNQueens(n) {

    const trace = [];

    let idCounter = 0;

    const board = [];

    let solutions = 0;

    function safe(row, col) {

        for (let r = 0; r < row; r++) {

            const c = board[r];

            if (c === col) {
                return false;
            }

            if (
                Math.abs(c - col) ===
                Math.abs(r - row)
            ) {
                return false;
            }
        }

        return true;
    }

    function solve(row, parentId = null, depth = 0) {

        const id = ++idCounter;

        const key = `Q(${row})`;

        trace.push({
            type: "enter",
            id,
            parentId,
            depth,
            key,
            label: key
        });

        if (row === n) {

            solutions++;

            trace.push({
                type: "exit",
                id,
                depth,
                value: solutions,
                message:
                    `Solution found #${solutions}.`
            });

            return;
        }

        for (let col = 0; col < n; col++) {

            if (!safe(row, col)) {

                trace.push({
                    type: "backtrack",
                    id,
                    message:
                        `Reject column ${col + 1}: conflict.`
                });

                continue;
            }

            trace.push({
                type: "decision",
                id,
                message:
                    `Try row ${row + 1}, column ${col + 1}.`
            });

            board[row] = col;

            trace.push({
                type: "choose",
                id,
                message:
                    `Place queen at (${row + 1}, ${col + 1}).`
            });

            solve(
                row + 1,
                id,
                depth + 1
            );

            delete board[row];

            trace.push({
                type: "backtrack",
                id,
                message:
                    `Remove queen from row ${row + 1}.`
            });
        }

        trace.push({
            type: "exit",
            id,
            depth,
            value: solutions,
            message:
                `Finish row ${row + 1}.`
        });
    }

    solve(0);

    trace.push({
        type: "finish",
        result: solutions
    });

    return trace;
}


/* =========================================================
   TABULATION — FIBONACCI
   ========================================================= */

function buildFibTable(n) {

    const trace = [];

    const table = [];

    for (let i = 0; i <= n; i++) {

        const value =
            i <= 1
                ? i
                : table[i - 1] + table[i - 2];

        table.push(value);

        trace.push({
            type: "table",
            row: i,
            value,
            key: `dp[${i}]`,
            message:
                i <= 1
                    ? `Base value dp[${i}] = ${value}.`
                    : `Fill dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${value}.`
        });
    }

    trace.push({
        type: "finish",
        result: table[n]
    });

    return trace;
}


/* =========================================================
   TABULATION — KNAPSACK
   ========================================================= */

function buildKnapsackTable(data) {

    const n = data.weights.length;
    const W = data.capacity;

    const dp =
        Array.from(
            { length: n + 1 },
            () => Array(W + 1).fill(0)
        );

    const trace = [];

    for (let i = 1; i <= n; i++) {

        for (let w = 0; w <= W; w++) {

            if (data.weights[i - 1] <= w) {

                dp[i][w] =
                    Math.max(
                        data.values[i - 1] +
                        dp[
                            i - 1
                        ][
                            w - data.weights[i - 1]
                        ],

                        dp[i - 1][w]
                    );

            } else {

                dp[i][w] =
                    dp[i - 1][w];
            }

            trace.push({
                type: "table",
                row: i,
                col: w,
                value: dp[i][w],
                key: `dp[${i}][${w}]`,
                message:
                    `Fill dp[${i}][${w}] = ${dp[i][w]}.`
            });
        }
    }

    trace.push({
        type: "finish",
        result: dp[n][W]
    });

    return trace;
}


/* =========================================================
   BUILD TRACE
   ========================================================= */

function buildTrace(problem, approach) {

    if (
        problem === "fib" &&
        approach === "normal"
    ) {
        return buildFibNormal(
            Number(fibInput.value)
        );
    }

    if (
        problem === "fib" &&
        approach === "memo"
    ) {
        return buildFibMemo(
            Number(fibInput.value)
        );
    }

    if (
        problem === "fib" &&
        approach === "tabulation"
    ) {
        return buildFibTable(
            Number(fibInput.value)
        );
    }

    if (
        problem === "knapsack" &&
        approach === "normal"
    ) {
        return buildKnapsackNormal(
            KNAPSACK_DATA[knapsackInput.value]
        );
    }

    if (
        problem === "knapsack" &&
        approach === "memo"
    ) {
        return buildKnapsackMemo(
            KNAPSACK_DATA[knapsackInput.value]
        );
    }

    if (
        problem === "knapsack" &&
        approach === "backtracking"
    ) {
        return buildKnapsackBacktracking(
            KNAPSACK_DATA[knapsackInput.value]
        );
    }

    if (
        problem === "knapsack" &&
        approach === "tabulation"
    ) {
        return buildKnapsackTable(
            KNAPSACK_DATA[knapsackInput.value]
        );
    }

    if (
        problem === "nqueen"
    ) {
        return buildNQueens(
            Number(queenInput.value)
        );
    }

    return [];
}


/* =========================================================
   RESET MAIN VISUALIZER
   ========================================================= */

function resetVisualizer() {

    stopMain();

    state.trace =
        buildTrace(
            state.problem,
            state.approach
        );

    state.cursor = 0;

    state.nodes.clear();
    state.edges = [];

    state.stack = [];

    state.calls = 0;
    state.hits = 0;
    state.maxStack = 0;

    state.solvedStates.clear();

    state.result = null;

    treeNodes.innerHTML = "";
    edgeLayer.innerHTML = "";

    stackList.innerHTML = "";

    memoStates.innerHTML = "";

    tableContainer.innerHTML = "";

    emptyTree.style.display = "grid";

    currentAction.textContent =
        "Press Play or Step to begin.";

    runBadge.textContent = "READY";

    globalStatus.textContent = "READY";

    updateMetrics();

    updateApproachCards();

    updateDPPanel();

    updateExplanation();

    updateTreeTitle();

    updateApplicability();
}


/* =========================================================
   STEP MAIN
   ========================================================= */

function stepMain() {

    if (state.cursor >= state.trace.length) {

        finishMain();

        return;
    }

    const event =
        state.trace[state.cursor];

    processMainEvent(event);

    state.cursor++;

    if (
        state.cursor >=
        state.trace.length
    ) {
        finishMain();
    }
}


/* =========================================================
   PROCESS EVENT
   ========================================================= */

function processMainEvent(event) {

    emptyTree.style.display = "none";

    if (event.type === "enter") {

        state.calls++;

        const node = {

            id: event.id,

            parentId: event.parentId,

            depth: event.depth,

            key: event.key,

            label: event.label,

            value: event.value,

            status:
                event.reused
                    ? "reused"
                    : "active"
        };

        state.nodes.set(
            event.id,
            node
        );

        if (event.parentId !== null) {

            state.edges.push({
                parentId: event.parentId,
                childId: event.id
            });
        }

        state.stack.push(event.id);

        state.maxStack =
            Math.max(
                state.maxStack,
                state.stack.length
            );

        currentAction.textContent =
            `Calling ${event.label}`;

        renderTree();

        renderStack();

        return;
    }


    if (event.type === "cache") {

        state.hits++;

        const node =
            state.nodes.get(event.id);

        if (node) {
            node.status = "reused";
            node.value = event.value;
        }

        currentAction.textContent =
            event.message;

        renderTree();

        updateMetrics();

        return;
    }


    if (event.type === "decision") {

        const node =
            state.nodes.get(event.id);

        if (node) {

            node.status =
                state.approach === "backtracking"
                    ? "decision"
                    : "active";
        }

        currentAction.textContent =
            event.message;

        renderTree();

        return;
    }


    if (event.type === "choose") {

        const node =
            state.nodes.get(event.id);

        if (node) {
            node.status = "decision";
        }

        currentAction.textContent =
            event.message;

        renderTree();

        return;
    }


    if (event.type === "backtrack") {

        const node =
            state.nodes.get(event.id);

        if (node) {
            node.status = "backtrack";
        }

        currentAction.textContent =
            event.message;

        renderTree();

        return;
    }


    if (event.type === "exit") {

        const node =
            state.nodes.get(event.id);

        if (node) {

            node.value =
                event.value;

            if (
                node.status !== "reused"
            ) {
                node.status = "complete";
            }
        }

        /* remove the call from the live stack */

        const index =
            state.stack.lastIndexOf(
                event.id
            );

        if (index !== -1) {
            state.stack.splice(
                index,
                1
            );
        }

        if (event.save) {

            state.solvedStates.add(
                node.key
            );

            addMemoState(
                node.key,
                event.value
            );
        }

        currentAction.textContent =
            event.message ||
            `Returned ${event.value}.`;

        renderTree();

        renderStack();

        updateMetrics();

        return;
    }


    if (event.type === "table") {

        renderTabulationCell(event);

        currentAction.textContent =
            event.message;

        return;
    }


    if (event.type === "finish") {

        state.result =
            event.result;

        currentAction.textContent =
            `Final answer: ${formatResult(event.result)}`;

        updateMetrics();

        return;
    }
}


/* =========================================================
   FINISH
   ========================================================= */

function finishMain() {

    stopMain();

    state.running = false;

    playBtn.textContent = "▶ Play";

    runBadge.textContent = "DONE";

    globalStatus.textContent = "DONE";

    if (
        state.result !== null
    ) {
        metricResult.textContent =
            formatResult(
                state.result
            );
    }
}


/* =========================================================
   PLAY
   ========================================================= */

function playMain() {

    if (
        state.cursor >=
        state.trace.length
    ) {
        resetVisualizer();
    }

    state.running = true;

    playBtn.textContent = "Ⅱ Pause";

    runBadge.textContent = "RUNNING";

    globalStatus.textContent = "RUNNING";

    runNext();
}


function runNext() {

    if (!state.running) {
        return;
    }

    stepMain();

    if (
        state.running &&
        state.cursor <
        state.trace.length
    ) {

        state.timer =
            setTimeout(
                runNext,
                delayFromSpeed()
            );
    }
}


function stopMain() {

    state.running = false;

    clearTimeout(
        state.timer
    );

    state.timer = null;

    playBtn.textContent =
        "▶ Play";
}


/* =========================================================
   TREE LAYOUT
   ========================================================= */

function calculateTreePositions() {

    const positions = new Map();

    const children =
        new Map();

    for (const node of state.nodes.values()) {

        children.set(
            node.id,
            []
        );
    }

    for (const edge of state.edges) {

        if (!children.has(edge.parentId)) {
            children.set(
                edge.parentId,
                []
            );
        }

        children
            .get(edge.parentId)
            .push(edge.childId);
    }

    let leafCounter = 0;

    function place(id) {

        const node =
            state.nodes.get(id);

        const kids =
            children.get(id) || [];

        if (kids.length === 0) {

            const x =
                90 +
                leafCounter * 105;

            leafCounter++;

            positions.set(
                id,
                {
                    x,
                    y:
                        55 +
                        node.depth * 100
                }
            );

            return x;
        }

        const childXs =
            kids.map(
                child => place(child)
            );

        const x =
            childXs.reduce(
                (a, b) => a + b,
                0
            ) / childXs.length;

        positions.set(
            id,
            {
                x,
                y:
                    55 +
                    node.depth * 100
            }
        );

        return x;
    }

    const roots =
        [...state.nodes.values()]
            .filter(
                n => n.parentId === null
            );

    roots.forEach(
        root => place(root.id)
    );

    return positions;
}


/* =========================================================
   RENDER TREE
   ========================================================= */

function renderTree() {

    if (
        state.approach ===
        "tabulation"
    ) {
        return;
    }

    const positions =
        calculateTreePositions();

    const maxX =
        Math.max(
            1000,
            ...[...positions.values()]
                .map(p => p.x + 100)
        );

    const maxY =
        Math.max(
            700,
            ...[...positions.values()]
                .map(p => p.y + 100)
        );

    treeSvg.style.width =
        `${maxX}px`;

    treeSvg.style.height =
        `${maxY}px`;

    treeNodes.style.width =
        `${maxX}px`;

    treeNodes.style.height =
        `${maxY}px`;

    treeSvg.setAttribute(
        "viewBox",
        `0 0 ${maxX} ${maxY}`
    );

    treeNodes.innerHTML = "";

    edgeLayer.innerHTML = "";

    /* edges */

    for (
        const edge of state.edges
    ) {

        const parent =
            positions.get(
                edge.parentId
            );

        const child =
            positions.get(
                edge.childId
            );

        if (!parent || !child) {
            continue;
        }

        const line =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "line"
            );

        const dx =
            child.x - parent.x;

        const dy =
            child.y - parent.y;

        const length =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        const ux =
            dx / length;

        const uy =
            dy / length;

        const radius = 35;

        line.setAttribute(
            "x1",
            parent.x + ux * radius
        );

        line.setAttribute(
            "y1",
            parent.y + uy * radius
        );

        line.setAttribute(
            "x2",
            child.x - ux * radius
        );

        line.setAttribute(
            "y2",
            child.y - uy * radius
        );

        edgeLayer.appendChild(
            line
        );
    }


    /* nodes */

    for (
        const node of state.nodes.values()
    ) {

        const position =
            positions.get(
                node.id
            );

        if (!position) {
            continue;
        }

        const element =
            document.createElement("div");

        element.className =
            `tree-node ${node.status}`;

        element.style.left =
            `${position.x}px`;

        element.style.top =
            `${position.y}px`;

        element.innerHTML = `
            <span class="node-label">
                ${node.label}
            </span>

            ${
                node.value !== null &&
                node.value !== undefined
                    ? `
                        <span class="node-value">
                            → ${node.value}
                        </span>
                    `
                    : `
                        <span class="node-value">
                            running
                        </span>
                    `
            }
        `;

        treeNodes.appendChild(
            element
        );
    }
}


/* =========================================================
   STACK
   ========================================================= */

function renderStack() {

    stackList.innerHTML = "";

    const reversed =
        [...state.stack]
            .reverse();

    reversed.forEach(
        (id, index) => {

            const node =
                state.nodes.get(id);

            if (!node) {
                return;
            }

            const frame =
                document.createElement("div");

            frame.className =
                `stack-frame ${
                    index === 0
                        ? "top"
                        : ""
                }`;

            frame.innerHTML = `
                <div class="stack-number">
                    ${state.stack.length - index}
                </div>

                <div>
                    <div class="stack-function">
                        solve()
                    </div>

                    <div class="stack-state">
                        ${node.label}
                    </div>
                </div>
            `;

            stackList.appendChild(
                frame
            );
        }
    );

    stackDepth.textContent =
        state.stack.length;
}


/* =========================================================
   METRICS
   ========================================================= */

function updateMetrics() {

    metricCalls.textContent =
        state.calls;

    const unique =
        new Set(
            [...state.nodes.values()]
                .map(n => n.key)
        );

    metricStates.textContent =
        unique.size;

    metricHits.textContent =
        state.hits;

    metricStack.textContent =
        state.maxStack;

    metricResult.textContent =
        state.result === null
            ? "—"
            : formatResult(
                state.result
            );
}


/* =========================================================
   DP STATES
   ========================================================= */

function addMemoState(
    key,
    value
) {

    if (
        document.querySelector(
            `[data-state="${key}"]`
        )
    ) {
        return;
    }

    const element =
        document.createElement("div");

    element.className =
        "memo-state new-state";

    element.dataset.state =
        key;

    element.innerHTML = `
        <span>${key}</span>
        <strong>${value}</strong>
    `;

    memoStates.appendChild(
        element
    );
}


/* =========================================================
   TABULATION
   ========================================================= */

function renderTabulationCell(event) {

    tableContainer.classList.remove(
        "hidden"
    );

    memoStates.classList.add(
        "hidden"
    );

    if (
        state.problem === "fib"
    ) {

        renderFibTable(
            event.row
        );

        return;
    }

    if (
        state.problem === "knapsack"
    ) {

        renderKnapsackTable(
            event.row,
            event.col
        );
    }
}


function renderFibTable(activeRow) {

    const n =
        Number(fibInput.value);

    let html = `
        <table class="dp-table">
            <tr>
    `;

    for (
        let i = 0;
        i <= n;
        i++
    ) {

        html += `
            <th>${i}</th>
        `;
    }

    html += `
            </tr>
            <tr>
    `;

    for (
        let i = 0;
        i <= n;
        i++
    ) {

        const completed =
            i < activeRow;

        const active =
            i === activeRow;

        const event =
            state.trace.find(
                e =>
                    e.type === "table" &&
                    e.row === i
            );

        html += `
            <td class="${
                active
                    ? "active-cell"
                    : completed
                        ? "filled"
                        : ""
            }">
                ${
                    event
                        ? event.value
                        : "·"
                }
            </td>
        `;
    }

    html += `
            </tr>
        </table>
    `;

    tableContainer.innerHTML =
        html;
}


function renderKnapsackTable(
    activeRow,
    activeCol
) {

    const data =
        KNAPSACK_DATA[
            knapsackInput.value
        ];

    const n =
        data.weights.length;

    const W =
        data.capacity;

    const filled =
        new Map();

    state.trace.forEach(
        event => {

            if (
                event.type === "table" &&
                (
                    event.row <
                    activeRow ||

                    (
                        event.row ===
                        activeRow &&
                        event.col <=
                        activeCol
                    )
                )
            ) {

                filled.set(
                    `${event.row},${event.col}`,
                    event.value
                );
            }
        }
    );

    let html = `
        <table class="dp-table">
            <tr>
                <th>item \\ cap</th>
    `;

    for (
        let w = 0;
        w <= W;
        w++
    ) {

        html += `
            <th>${w}</th>
        `;
    }

    html += `
            </tr>
    `;

    for (
        let i = 0;
        i <= n;
        i++
    ) {

        html += `
            <tr>
                <th>${i}</th>
        `;

        for (
            let w = 0;
            w <= W;
            w++
        ) {

            const key =
                `${i},${w}`;

            const active =
                i === activeRow &&
                w === activeCol;

            const value =
                filled.has(key)
                    ? filled.get(key)
                    : "·";

            html += `
                <td class="${
                    active
                        ? "active-cell"
                        : filled.has(key)
                            ? "filled"
                            : ""
                }">
                    ${value}
                </td>
            `;
        }

        html += `
            </tr>
        `;
    }

    html += `
        </table>
    `;

    tableContainer.innerHTML =
        html;
}


/* =========================================================
   DP PANEL
   ========================================================= */

function updateDPPanel() {

    if (
        state.approach !== "memo" &&
        state.approach !== "tabulation"
    ) {

        dpPanel.classList.add(
            "hidden"
        );

        return;
    }

    dpPanel.classList.remove(
        "hidden"
    );

    if (
        state.approach === "memo"
    ) {

        dpTitle.textContent =
            "Saved States";

        dpDescription.textContent =
            "A completed state is stored so future calls can reuse it.";

        dpMethod.textContent =
            "MEMOIZATION";

        dpMethod.style.color =
            "var(--cyan)";

        memoStates.classList.remove(
            "hidden"
        );

        tableContainer.classList.add(
            "hidden"
        );

    } else {

        dpTitle.textContent =
            "DP Table";

        dpDescription.textContent =
            "The solution is built from smaller states upward.";

        dpMethod.textContent =
            "TABULATION";

        dpMethod.style.color =
            "var(--blue)";

        memoStates.classList.add(
            "hidden"
        );

        tableContainer.classList.remove(
            "hidden"
        );
    }
}


/* =========================================================
   TITLES
   ========================================================= */

function updateTreeTitle() {

    if (
        state.approach ===
        "tabulation"
    ) {

        treeTitle.textContent =
            "Execution View";

    } else {

        treeTitle.textContent =
            "Recursion Tree";
    }
}


/* =========================================================
   APPROACH CARDS
   ========================================================= */

function updateApproachCards() {

    document
        .querySelectorAll(
            ".approach-card"
        )
        .forEach(card => {

            card.classList.toggle(
                "selected",
                card.dataset.method ===
                state.approach
            );
        });
}


/* =========================================================
   APPLICABILITY
   ========================================================= */

function updateApplicability() {

    const cards =
        document.querySelectorAll(
            ".approach-card"
        );

    cards.forEach(card => {

        const method =
            card.dataset.method;

        const badge =
            card.querySelector(
                ".badge"
            );

        let applicable = true;

        if (
            state.problem ===
            "nqueen"
        ) {

            if (
                method === "memo" ||
                method === "tabulation"
            ) {
                applicable = false;
            }
        }

        if (
            state.problem ===
            "fib"
        ) {

            if (
                method ===
                "backtracking"
            ) {
                applicable = false;
            }
        }

        if (
            state.problem ===
            "knapsack"
        ) {

            applicable = true;
        }

        badge.textContent =
            applicable
                ? "APPLICABLE"
                : "NOT NATURAL";

        badge.style.background =
            applicable
                ? "#edf0ff"
                : "#f1f3f6";

        badge.style.color =
            applicable
                ? "var(--blue)"
                : "#8a94a6";
    });
}


/* =========================================================
   EXPLANATION
   ========================================================= */

function updateExplanation() {

    if (
        state.problem === "fib"
    ) {

        if (
            state.approach ===
            "normal"
        ) {

            whyTitle.textContent =
                "Normal recursion repeats work.";

            whyText.textContent =
                "When F(k) is reached again, it is calculated again from scratch.";

            complexityTime.textContent =
                "O(2ⁿ)";

            complexitySpace.textContent =
                "O(n)";

        }

        else if (
            state.approach ===
            "memo"
        ) {

            whyTitle.textContent =
                "Memoization remembers previous answers.";

            whyText.textContent =
                "The first call solves F(k). Later calls find F(k) in the cache instead of expanding the same subtree.";

            complexityTime.textContent =
                "O(n)";

            complexitySpace.textContent =
                "O(n)";

        }

        else if (
            state.approach ===
            "tabulation"
        ) {

            whyTitle.textContent =
                "Tabulation removes recursion entirely.";

            whyText.textContent =
                "The smallest Fibonacci states are calculated first, then larger states are built iteratively.";

            complexityTime.textContent =
                "O(n)";

            complexitySpace.textContent =
                "O(n)";

        }

        else {

            whyTitle.textContent =
                "Backtracking explores choices.";

            whyText.textContent =
                "Backtracking is mainly useful when a problem requires exploring a decision space and undoing choices.";

            complexityTime.textContent =
                "Problem dependent";

            complexitySpace.textContent =
                "O(n)";
        }

        return;
    }


    if (
        state.problem ===
        "knapsack"
    ) {

        if (
            state.approach ===
            "normal"
        ) {

            whyTitle.textContent =
                "Every knapsack state can be recalculated.";

            whyText.textContent =
                "Different branches may reach the same (item, capacity) state, but normal recursion solves it repeatedly.";

            complexityTime.textContent =
                "O(2ⁿ)";

            complexitySpace.textContent =
                "O(n)";
        }

        else if (
            state.approach ===
            "memo"
        ) {

            whyTitle.textContent =
                "Overlapping states are stored.";

            whyText.textContent =
                "The pair (item, capacity) defines a DP state. Once solved, the answer can be reused.";

            complexityTime.textContent =
                "O(nW)";

            complexitySpace.textContent =
                "O(nW)";
        }

        else if (
            state.approach ===
            "tabulation"
        ) {

            whyTitle.textContent =
                "Bottom-up DP fills a state table.";

            whyText.textContent =
                "Instead of recursively asking for smaller states, the table explicitly calculates them in dependency order.";

            complexityTime.textContent =
                "O(nW)";

            complexitySpace.textContent =
                "O(nW)";
        }

        else {

            whyTitle.textContent =
                "Backtracking explores choices and undoes them.";

            whyText.textContent =
                "Each item creates an include/exclude decision. The algorithm explores one choice, then reverses it to explore another.";

            complexityTime.textContent =
                "O(2ⁿ)";

            complexitySpace.textContent =
                "O(n)";
        }

        return;
    }


    if (
        state.problem ===
        "nqueen"
    ) {

        whyTitle.textContent =
            "Backtracking searches a decision tree.";

        whyText.textContent =
            "A queen is placed only when the partial board remains valid. Invalid choices are rejected and previous choices are undone.";

        complexityTime.textContent =
            "O(n!)";

        complexitySpace.textContent =
            "O(n)";
    }
}


/* =========================================================
   PROBLEM CHANGE
   ========================================================= */

function updateInputVisibility() {

    fibInputGroup.classList.toggle(
        "hidden",
        state.problem !== "fib"
    );

    knapsackInputGroup.classList.toggle(
        "hidden",
        state.problem !== "knapsack"
    );

    queenInputGroup.classList.toggle(
        "hidden",
        state.problem !== "nqueen"
    );

    updateApproachOptions();
}


function updateApproachOptions() {

    const options =
        [...approachSelect.options];

    options.forEach(option => {

        if (
            state.problem ===
            "nqueen"
        ) {

            option.hidden =
                option.value === "memo" ||
                option.value === "tabulation";

        } else if (
            state.problem === "fib"
        ) {

            option.hidden =
                option.value ===
                "backtracking";

        } else {

            option.hidden = false;
        }
    });

    const selected =
        approachSelect.options[
            approachSelect.selectedIndex
        ];

    if (
        selected &&
        selected.hidden
    ) {

        approachSelect.value =
            state.problem ===
            "nqueen"
                ? "backtracking"
                : "normal";

        state.approach =
            approachSelect.value;
    }
}


/* =========================================================
   EVENTS
   ========================================================= */

problemSelect.addEventListener(
    "change",
    () => {

        state.problem =
            problemSelect.value;

        updateInputVisibility();

        resetVisualizer();
    }
);


fibInput.addEventListener(
    "change",
    resetVisualizer
);

knapsackInput.addEventListener(
    "change",
    resetVisualizer
);

queenInput.addEventListener(
    "change",
    resetVisualizer
);


approachSelect.addEventListener(
    "change",
    () => {

        state.approach =
            approachSelect.value;

        resetVisualizer();
    }
);


playBtn.addEventListener(
    "click",
    () => {

        if (state.running) {

            stopMain();

            runBadge.textContent =
                "PAUSED";

            globalStatus.textContent =
                "PAUSED";

        } else {

            playMain();
        }
    }
);


stepBtn.addEventListener(
    "click",
    () => {

        if (state.running) {
            stopMain();
        }

        stepMain();
    }
);


resetBtn.addEventListener(
    "click",
    resetVisualizer
);


slowBtn.addEventListener(
    "click",
    () => {

        state.speed =
            Math.max(
                0.5,
                state.speed - 0.5
            );

        speedLabel.textContent =
            `${state.speed}×`;
    }
);


fastBtn.addEventListener(
    "click",
    () => {

        state.speed =
            Math.min(
                2,
                state.speed + 0.5
            );

        speedLabel.textContent =
            `${state.speed}×`;
    }
);


/* =========================================================
   COMPARISON ENGINE
   ========================================================= */

function buildComparisonTrace(
    method
) {

    return buildTrace(
        state.problem,
        method
    );
}


function startComparison() {

    stopComparison();

    comparison.traceA =
        buildComparisonTrace(
            compareA.value
        );

    comparison.traceB =
        buildComparisonTrace(
            compareB.value
        );

    comparison.cursor = 0;

    comparison.nodesA.clear();
    comparison.nodesB.clear();

    comparison.firstDifference = null;

    compareNodesA.innerHTML = "";
    compareNodesB.innerHTML = "";

    compareEdgesA.innerHTML = "";
    compareEdgesB.innerHTML = "";

    compareTitleA.textContent =
        methodName(
            compareA.value
        );

    compareTitleB.textContent =
        methodName(
            compareB.value
        );

    compareProgressA.textContent =
        `0 / ${comparison.traceA.length}`;

    compareProgressB.textContent =
        `0 / ${comparison.traceB.length}`;

    differenceTitle.textContent =
        "Comparison running.";

    differenceText.textContent =
        "Watch the two executions. The first behavioural difference will be highlighted.";

    detailTitle.textContent =
        "No divergence reached yet.";

    detailText.textContent =
        "Step through both executions.";

    comparison.running = true;

    compareNext();
}


function compareNext() {

    if (!comparison.running) {
        return;
    }

    const a =
        comparison.traceA[
            comparison.cursor
        ];

    const b =
        comparison.traceB[
            comparison.cursor
        ];

    if (a) {

        processComparisonEvent(
            a,
            "A"
        );
    }

    if (b) {

        processComparisonEvent(
            b,
            "B"
        );
    }

    checkComparisonDifference(
        a,
        b
    );

    comparison.cursor++;

    compareProgressA.textContent =
        `${Math.min(
            comparison.cursor,
            comparison.traceA.length
        )} / ${comparison.traceA.length}`;

    compareProgressB.textContent =
        `${Math.min(
            comparison.cursor,
            comparison.traceB.length
        )} / ${comparison.traceB.length}`;

    if (
        comparison.cursor <
        Math.max(
            comparison.traceA.length,
            comparison.traceB.length
        )
    ) {

        comparison.timer =
            setTimeout(
                compareNext,
                delayFromSpeed()
            );

    } else {

        finishComparison();
    }
}


function stepComparison() {

    if (
        comparison.cursor >=
        Math.max(
            comparison.traceA.length,
            comparison.traceB.length
        )
    ) {

        finishComparison();

        return;
    }

    const a =
        comparison.traceA[
            comparison.cursor
        ];

    const b =
        comparison.traceB[
            comparison.cursor
        ];

    if (a) {
        processComparisonEvent(
            a,
            "A"
        );
    }

    if (b) {
        processComparisonEvent(
            b,
            "B"
        );
    }

    checkComparisonDifference(
        a,
        b
    );

    comparison.cursor++;

    compareProgressA.textContent =
        `${Math.min(
            comparison.cursor,
            comparison.traceA.length
        )} / ${comparison.traceA.length}`;

    compareProgressB.textContent =
        `${Math.min(
            comparison.cursor,
            comparison.traceB.length
        )} / ${comparison.traceB.length}`;
}


function processComparisonEvent(
    event,
    side
) {

    const nodes =
        side === "A"
            ? comparison.nodesA
            : comparison.nodesB;

    const container =
        side === "A"
            ? compareNodesA
            : compareNodesB;

    const edgeContainer =
        side === "A"
            ? compareEdgesA
            : compareEdgesB;

    if (
        event.type ===
        "enter"
    ) {

        nodes.set(
            event.id,
            {
                id: event.id,
                parentId: event.parentId,
                depth: event.depth,
                label: event.label,
                key: event.key,
                value: event.value,
                status:
                    event.reused
                        ? "reused"
                        : "active"
            }
        );

        renderComparisonTree(
            side,
            nodes,
            container,
            edgeContainer
        );

        return;
    }


    if (
        event.type ===
        "cache"
    ) {

        const node =
            nodes.get(event.id);

        if (node) {

            node.status =
                "reused";

            node.value =
                event.value;
        }

        renderComparisonTree(
            side,
            nodes,
            container,
            edgeContainer
        );

        return;
    }


    if (
        event.type ===
        "decision"
    ) {

        const node =
            nodes.get(event.id);

        if (node) {

            node.status =
                "decision";
        }

        renderComparisonTree(
            side,
            nodes,
            container,
            edgeContainer
        );

        return;
    }


    if (
        event.type ===
        "choose"
    ) {

        const node =
            nodes.get(event.id);

        if (node) {
            node.status =
                "decision";
        }

        renderComparisonTree(
            side,
            nodes,
            container,
            edgeContainer
        );

        return;
    }


    if (
        event.type ===
        "backtrack"
    ) {

        const node =
            nodes.get(event.id);

        if (node) {
            node.status =
                "backtrack";
        }

        renderComparisonTree(
            side,
            nodes,
            container,
            edgeContainer
        );

        return;
    }


    if (
        event.type ===
        "exit"
    ) {

        const node =
            nodes.get(event.id);

        if (node) {

            node.value =
                event.value;

            if (
                node.status !==
                "reused"
            ) {
                node.status =
                    "complete";
            }
        }

        renderComparisonTree(
            side,
            nodes,
            container,
            edgeContainer
        );
    }
}


/* =========================================================
   COMPARISON TREE LAYOUT
   ========================================================= */

function comparisonPositions(
    nodes
) {

    const children =
        new Map();

    nodes.forEach(
        node => {
            children.set(
                node.id,
                []
            );
        }
    );

    nodes.forEach(
        node => {

            if (
                node.parentId !==
                null &&
                children.has(
                    node.parentId
                )
            ) {

                children
                    .get(node.parentId)
                    .push(node.id);
            }
        }
    );

    const positions =
        new Map();

    let leaf = 0;

    function place(id) {

        const node =
            nodes.get(id);

        const kids =
            children.get(id) || [];

        if (
            kids.length === 0
        ) {

            const x =
                75 +
                leaf * 82;

            leaf++;

            positions.set(
                id,
                {
                    x,
                    y:
                        48 +
                        node.depth * 82
                }
            );

            return x;
        }

        const xs =
            kids.map(
                place
            );

        const x =
            xs.reduce(
                (a,b) => a + b,
                0
            ) / xs.length;

        positions.set(
            id,
            {
                x,
                y:
                    48 +
                    node.depth * 82
            }
        );

        return x;
    }

    const roots =
        [...nodes.values()]
            .filter(
                node =>
                    node.parentId === null
            );

    roots.forEach(
        root =>
            place(root.id)
    );

    return positions;
}


/* =========================================================
   RENDER COMPARISON TREE
   ========================================================= */

function renderComparisonTree(
    side,
    nodes,
    container,
    edgeContainer
) {

    const positions =
        comparisonPositions(
            nodes
        );

    const width =
        Math.max(
            1000,
            ...[...positions.values()]
                .map(
                    p => p.x + 80
                )
        );

    const height =
        Math.max(
            700,
            ...[...positions.values()]
                .map(
                    p => p.y + 80
                )
        );

    const tree =
        side === "A"
            ? compareTreeA
            : compareTreeB;

    const svg =
        tree.querySelector(
            "svg"
        );

    svg.style.width =
        `${width}px`;

    svg.style.height =
        `${height}px`;

    container.style.width =
        `${width}px`;

    container.style.height =
        `${height}px`;

    edgeContainer.innerHTML = "";

    container.innerHTML = "";

    /* edges */

    nodes.forEach(
        node => {

            if (
                node.parentId === null
            ) {
                return;
            }

            const parent =
                positions.get(
                    node.parentId
                );

            const child =
                positions.get(
                    node.id
                );

            if (!parent || !child) {
                return;
            }

            const line =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "line"
                );

            const dx =
                child.x -
                parent.x;

            const dy =
                child.y -
                parent.y;

            const length =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            const ux =
                dx / length;

            const uy =
                dy / length;

            const radius = 31;

            line.setAttribute(
                "x1",
                parent.x +
                ux * radius
            );

            line.setAttribute(
                "y1",
                parent.y +
                uy * radius
            );

            line.setAttribute(
                "x2",
                child.x -
                ux * radius
            );

            line.setAttribute(
                "y2",
                child.y -
                uy * radius
            );

            edgeContainer.appendChild(
                line
            );
        }
    );


    /* nodes */

    nodes.forEach(
        node => {

            const position =
                positions.get(
                    node.id
                );

            if (!position) {
                return;
            }

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                `compare-node ${node.status}`;

            element.style.left =
                `${position.x}px`;

            element.style.top =
                `${position.y}px`;

            element.innerHTML =
                node.value !== null &&
                node.value !== undefined
                    ? `
                        <span>
                            ${node.label}
                            <br>
                            → ${node.value}
                        </span>
                    `
                    : `
                        <span>
                            ${node.label}
                        </span>
                    `;

            container.appendChild(
                element
            );
        }
    );
}


/* =========================================================
   COMPARISON DIFFERENCE DETECTION
   ========================================================= */

function checkComparisonDifference(
    a,
    b
) {

    if (
        comparison.firstDifference
    ) {
        return;
    }

    if (!a || !b) {

        comparison.firstDifference = {
            step:
                comparison.cursor + 1,
            reason:
                "One approach has already finished while the other still has execution steps."
        };

        showDifference(
            comparison.firstDifference
        );

        return;
    }


    /* Different event type */

    if (
        a.type !==
        b.type
    ) {

        comparison.firstDifference = {

            step:
                comparison.cursor + 1,

            reason:
                `Approach A performs "${eventReadable(a.type)}" while Approach B performs "${eventReadable(b.type)}".`,

            a,
            b
        };

        showDifference(
            comparison.firstDifference
        );

        return;
    }


    /* Same event but different state */

    if (
        a.key &&
        b.key &&
        a.key !== b.key
    ) {

        comparison.firstDifference = {

            step:
                comparison.cursor + 1,

            reason:
                `The executions reach different states: ${a.key} vs ${b.key}.`,

            a,
            b
        };

        showDifference(
            comparison.firstDifference
        );

        return;
    }


    /* Memoization cache is the important divergence */

    if (
        a.type === "enter" &&
        b.type === "enter"
    ) {

        if (
            !!a.reused !==
            !!b.reused
        ) {

            comparison.firstDifference = {

                step:
                    comparison.cursor + 1,

                reason:
                    a.reused
                        ? `Approach A reuses an existing state while Approach B calculates it again.`
                        : `Approach B reuses an existing state while Approach A calculates it again.`,

                a,
                b
            };

            showDifference(
                comparison.firstDifference
            );

            return;
        }
    }
}


function eventReadable(type) {

    return {

        enter: "function call",

        exit: "return",

        cache: "cache reuse",

        decision: "decision",

        choose: "choice",

        backtrack: "backtrack",

        table: "DP table update",

        finish: "final answer"

    }[type] || type;
}


/* =========================================================
   SHOW DIFFERENCE
   ========================================================= */

function showDifference(
    diff
) {

    differenceNumber.textContent =
        String(
            diff.step
        ).padStart(
            2,
            "0"
        );

    differenceTitle.textContent =
        "This is where the execution diverges.";

    differenceText.textContent =
        diff.reason;

    detailTitle.textContent =
        `Step ${diff.step}: Behaviour changes`;

    detailText.textContent =
        diff.reason;

    differenceBanner.style.borderLeftColor =
        "var(--red)";

    differenceNumber.style.background =
        "var(--red)";

    differenceNumber.style.color =
        "white";
}


/* =========================================================
   COMPARISON FINISH
   ========================================================= */

function finishComparison() {

    comparison.running = false;

    clearTimeout(
        comparison.timer
    );

    if (
        !comparison.firstDifference
    ) {

        differenceTitle.textContent =
            "No meaningful divergence found.";

        differenceText.textContent =
            "The two traces behaved the same for the executed steps.";
    }
}


function stopComparison() {

    comparison.running = false;

    clearTimeout(
        comparison.timer
    );
}


/* =========================================================
   COMPARISON BUTTONS
   ========================================================= */

compareBtn.addEventListener(
    "click",
    () => {

        startComparison();
    }
);


compareStepBtn.addEventListener(
    "click",
    () => {

        stopComparison();

        if (
            comparison.traceA.length === 0
        ) {

            comparison.traceA =
                buildComparisonTrace(
                    compareA.value
                );

            comparison.traceB =
                buildComparisonTrace(
                    compareB.value
                );

            comparison.cursor = 0;

            comparison.nodesA.clear();
            comparison.nodesB.clear();

            compareNodesA.innerHTML = "";
            compareNodesB.innerHTML = "";

            compareEdgesA.innerHTML = "";
            compareEdgesB.innerHTML = "";

            comparison.firstDifference =
                null;
        }

        stepComparison();
    }
);


/* =========================================================
   FORMAT RESULT
   ========================================================= */

function formatResult(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    return String(value);
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initialize() {

    state.problem =
        problemSelect.value;

    state.approach =
        approachSelect.value;

    updateInputVisibility();

    resetVisualizer();
}


initialize();

