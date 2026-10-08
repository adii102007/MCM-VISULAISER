import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// --- Constants & Config ---
const DEFAULT_ARRAY = [2, 3, 5, 6];
const DEFAULT_TARGET = 8;
const ANIMATION_SPEEDS = [1000, 500, 200, 50]; // ms per step

const COLORS = {
  bgDark: '#0f172a',      // slate-900
  bgPanel: '#1e293b',     // slate-800
  border: '#334155',      // slate-700
  text: '#f8fafc',        // slate-50
  textMuted: '#94a3b8',   // slate-400
  nodeDefault: '#334155', // slate-700
  nodeActive: '#2563eb',  // blue-600
  nodePruned: '#991b1b',  // red-800
  nodeCache: '#ca8a04',   // yellow-600
  nodeSuccess: '#15803d', // green-700
  nodeReturned: '#1e293b',// slate-800 (dimmed)
};

// Standalone SVG Icons to ensure no external dependencies break the UI
const IconPlay = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const IconPause = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
const IconStepFwd = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>;
const IconStepBack = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>;
const IconRefresh = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>;
const IconZoomIn = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>;
const IconZoomOut = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>;

/**
 * Core Algorithm Engine: Computes the entire state space traversal upfront.
 * Returns an array of execution steps (trace) and the computed tree layout.
 */
function generateExecutionEngine(arr, target, mode) {
  let trace = [];
  let callIdSequence = 0;
  let metrics = { calls: 0, pruned: 0, hits: 0, maxDepth: 0 };
  let memo = {}; // Format: "idx-sum": boolean
  let treeNodes = {}; // For layout calculations

  function solve(idx, sum, parentId, depth, isLeft) {
    let id = `node_${callIdSequence++}`;
    metrics.calls++;
    metrics.maxDepth = Math.max(metrics.maxDepth, depth);

    // Register node for tree layout
    treeNodes[id] = { id, parentId, idx, sum, depth, isLeft };

    let currentMemo = { ...memo };

    // Action: Function Called
    trace.push({
      stepIndex: trace.length,
      action: "CALL", id, parentId, idx, sum, depth,
      metrics: { ...metrics }, memo: currentMemo, nodeData: treeNodes[id]
    });

    // DP Paradigm: Cache Check
    if (mode === 'DP' && memo[`${idx}-${sum}`] !== undefined) {
      metrics.hits++;
      trace.push({
        stepIndex: trace.length, action: "CACHE_HIT", id, parentId, idx, sum, depth,
        result: memo[`${idx}-${sum}`], metrics: { ...metrics }, memo: currentMemo, nodeData: treeNodes[id]
      });
      return memo[`${idx}-${sum}`];
    }

    // Backtracking / DP Paradigm: Constraint Pruning
    if ((mode === 'BACKTRACK' || mode === 'DP') && sum > target) {
      metrics.pruned++;
      trace.push({
        stepIndex: trace.length, action: "PRUNE", id, parentId, idx, sum, depth,
        result: false, metrics: { ...metrics }, memo: currentMemo, nodeData: treeNodes[id]
      });
      return false;
    }

    // Base Case: Target Reached
    if (sum === target) {
      if (mode === 'DP') memo[`${idx}-${sum}`] = true;
      trace.push({
        stepIndex: trace.length, action: "SUCCESS", id, parentId, idx, sum, depth,
        result: true, metrics: { ...metrics }, memo: { ...memo }, nodeData: treeNodes[id]
      });
      return true;
    }

    // Base Case: Array Exhausted
    if (idx >= arr.length) {
      if (mode === 'DP') memo[`${idx}-${sum}`] = false;
      trace.push({
        stepIndex: trace.length, action: "BASE", id, parentId, idx, sum, depth,
        result: false, metrics: { ...metrics }, memo: { ...memo }, nodeData: treeNodes[id]
      });
      return false;
    }

    // Branch 1: Exclude Current Element (Left Child)
    let resExclude = solve(idx + 1, sum, id, depth + 1, true);
    if (resExclude) {
      if (mode === 'DP') memo[`${idx}-${sum}`] = true;
      trace.push({
        stepIndex: trace.length, action: "RETURN", id, parentId, idx, sum, depth,
        result: true, metrics: { ...metrics }, memo: { ...memo }, nodeData: treeNodes[id]
      });
      return true;
    }

    // Branch 2: Include Current Element (Right Child)
    let resInclude = solve(idx + 1, sum + arr[idx], id, depth + 1, false);
    if (mode === 'DP') memo[`${idx}-${sum}`] = resInclude;
    
    trace.push({
      stepIndex: trace.length, action: "RETURN", id, parentId, idx, sum, depth,
      result: resInclude, metrics: { ...metrics }, memo: { ...memo }, nodeData: treeNodes[id]
    });
    return resInclude;
  }

  solve(0, 0, null, 0, false);

  // --- Tree Layout Calculation ---
  // A standard complete binary tree mapping logic to assign X, Y coordinates
  const HORIZONTAL_SPREAD = 800; // Base width unit
  const VERTICAL_SPACING = 80;

  Object.values(treeNodes).forEach(node => {
    node.y = node.depth * VERTICAL_SPACING;
    if (node.parentId === null) {
      node.x = 0;
    } else {
      let parent = treeNodes[node.parentId];
      // Reduce spread exponentially based on depth to prevent overlaps
      let offset = HORIZONTAL_SPREAD / Math.pow(2, node.depth + 1);
      node.x = node.isLeft ? parent.x - offset : parent.x + offset;
    }
  });

  return { trace, treeNodes };
}

function usePanZoom() {
  const [transform, setTransform] = useState({ x: 0, y: 50, scale: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  };

  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseLeave = () => { isDragging.current = false; };

  const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(p.scale + 0.2, 3) }));
  const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(p.scale - 0.2, 0.3) }));
  const resetZoom = () => setTransform({ x: 0, y: 50, scale: 1 });

  return { transform, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, zoomIn, zoomOut, resetZoom };
}

export default function StateSpaceVisualizer() {
  // Configuration State
  const [array] = useState(DEFAULT_ARRAY);
  const [target] = useState(DEFAULT_TARGET);
  const [mode, setMode] = useState('RECURSION'); // RECURSION, BACKTRACK, DP
  
  // Execution State
  const [engineData, setEngineData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1); // Default 500ms
  
  // Viewport Interaction
  const panZoom = usePanZoom();

  // 1. Initialize Engine on Mount or Config Change
  useEffect(() => {
    const data = generateExecutionEngine(array, target, mode);
    setEngineData(data);
    setCurrentStep(0);
    setIsPlaying(false);
    panZoom.resetZoom();
  }, [mode, array, target]);

  // 2. Playback Loop
  useEffect(() => {
    let timer;
    if (isPlaying && engineData && currentStep < engineData.trace.length - 1) {
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, ANIMATION_SPEEDS[speedIdx]);
    } else if (currentStep >= (engineData?.trace.length || 0) - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, engineData, speedIdx]);

  // Calculate current visual state from the trace
  const activeTrace = engineData?.trace[currentStep] || null;
  const metrics = activeTrace?.metrics || { calls: 0, pruned: 0, hits: 0, maxDepth: 0 };
  const currentMemo = activeTrace?.memo || {};

  // Reconstruct Call Stack and Node Statuses up to current step
  const nodeStatuses = useMemo(() => {
    if (!engineData) return {};
    let statuses = {}; // id -> status string
    for (let i = 0; i <= currentStep; i++) {
      let step = engineData.trace[i];
      if (step.action === "CALL") statuses[step.id] = "ACTIVE";
      if (step.action === "PRUNE") statuses[step.id] = "PRUNED";
      if (step.action === "CACHE_HIT") statuses[step.id] = "CACHE_HIT";
      if (step.action === "SUCCESS") statuses[step.id] = "SUCCESS";
      if (step.action === "RETURN" || step.action === "BASE") {
        // Keep special colors, otherwise dim
        if (statuses[step.id] !== "SUCCESS" && statuses[step.id] !== "PRUNED" && statuses[step.id] !== "CACHE_HIT") {
          statuses[step.id] = "RETURNED";
        }
      }
    }
    return statuses;
  }, [engineData, currentStep]);

  const callStack = useMemo(() => {
    if (!engineData) return [];
    let stack = [];
    for (let i = 0; i <= currentStep; i++) {
      let step = engineData.trace[i];
      if (step.action === "CALL") stack.push(step);
      if (step.action === "RETURN" || step.action === "PRUNE" || step.action === "CACHE_HIT" || step.action === "SUCCESS" || step.action === "BASE") {
        // Only pop if it matches the top of the stack (which it should in normal execution)
        if (stack.length > 0 && stack[stack.length - 1].id === step.id) {
            stack.pop();
        }
      }
    }
    return stack.reverse(); // Top of stack first
  }, [engineData, currentStep]);

  // Graph rendering helpers
  const getNodeColor = (status) => {
    switch(status) {
      case 'ACTIVE': return COLORS.nodeActive;
      case 'PRUNED': return COLORS.nodePruned;
      case 'CACHE_HIT': return COLORS.nodeCache;
      case 'SUCCESS': return COLORS.nodeSuccess;
      case 'RETURNED': return COLORS.nodeReturned;
      default: return COLORS.nodeDefault;
    }
  };

  const getEdgeStyle = (childId) => {
    const status = nodeStatuses[childId];
    if (!status) return { stroke: COLORS.border, width: 2, dashed: false };
    if (status === 'ACTIVE') return { stroke: COLORS.nodeActive, width: 3, dashed: false };
    if (status === 'PRUNED') return { stroke: COLORS.nodePruned, width: 2, dashed: true };
    if (status === 'CACHE_HIT') return { stroke: COLORS.nodeCache, width: 3, dashed: false };
    if (status === 'SUCCESS') return { stroke: COLORS.nodeSuccess, width: 3, dashed: false };
    return { stroke: COLORS.border, width: 2, dashed: false };
  };

  if (!engineData) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">Initializing Engine...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-blue-900">
      
      {/* Header Panel */}
      <header className="flex justify-between items-center px-6 py-4 bg-slate-900 border-b border-slate-800 z-10 shrink-0 shadow-lg">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            AlgoVis Pro: State-Space
          </h1>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            Subset Sum | Target: <span className="text-green-400">{target}</span> | Arr: [{array.join(', ')}]
          </div>
        </div>

        {/* Paradigm Selector */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner">
          {['RECURSION', 'BACKTRACK', 'DP'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === m 
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {m === 'RECURSION' ? 'Standard Recursion' : m === 'BACKTRACK' ? 'Backtracking' : 'Dynamic Prog.'}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left: Interactive Canvas */}
        <div 
          className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={panZoom.handleMouseDown}
          onMouseMove={panZoom.handleMouseMove}
          onMouseUp={panZoom.handleMouseUp}
          onMouseLeave={panZoom.handleMouseLeave}
          style={{ background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' }}
        >
          {/* Canvas Controls */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <button onClick={panZoom.zoomIn} className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded border border-slate-700 backdrop-blur"><IconZoomIn /></button>
            <button onClick={panZoom.zoomOut} className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded border border-slate-700 backdrop-blur"><IconZoomOut /></button>
            <button onClick={panZoom.resetZoom} className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 rounded border border-slate-700 backdrop-blur text-xs font-semibold uppercase">Reset View</button>
          </div>

          {/* Render Surface */}
          <div 
            className="absolute top-0 left-1/2 origin-top"
            style={{ 
              transform: `translate(calc(-50% + ${panZoom.transform.x}px), ${panZoom.transform.y}px) scale(${panZoom.transform.scale})`,
              transition: panZoom.isDragging.current ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {/* Edges Layer (SVG) */}
            <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ zIndex: 0 }}>
              {Object.values(engineData.treeNodes).map(node => {
                if (!node.parentId) return null;
                const parent = engineData.treeNodes[node.parentId];
                const isRendered = !!nodeStatuses[node.id];
                if (!isRendered) return null;

                const style = getEdgeStyle(node.id);
                return (
                  <line 
                    key={`edge_${node.id}`}
                    x1={parent.x} y1={parent.y + 20} 
                    x2={node.x} y2={node.y - 20}
                    stroke={style.stroke}
                    strokeWidth={style.width}
                    strokeDasharray={style.dashed ? "6,6" : "none"}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>

            {/* Nodes Layer (HTML) */}
            {Object.values(engineData.treeNodes).map(node => {
              const status = nodeStatuses[node.id];
              if (!status) return null; // Not yet reached in time

              const bgColor = getNodeColor(status);
              const isActive = status === 'ACTIVE';
              const isCache = status === 'CACHE_HIT';
              const isPruned = status === 'PRUNED';

              return (
                <div 
                  key={node.id}
                  className={`absolute flex items-center justify-center font-mono text-xs font-bold rounded-full border-2 transition-all duration-300
                    ${isActive ? 'scale-125 z-20 shadow-[0_0_25px_rgba(37,99,235,0.8)]' : 'z-10'}
                    ${isCache ? 'shadow-[0_0_20px_rgba(202,138,4,0.6)] animate-pulse' : ''}
                    ${isPruned ? 'animate-[shake_0.4s_ease-in-out]' : ''}
                  `}
                  style={{
                    width: '40px', height: '40px',
                    left: `${node.x}px`, top: `${node.y}px`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: bgColor,
                    borderColor: isActive || isCache ? '#fff' : bgColor,
                    color: status === 'RETURNED' ? COLORS.textMuted : '#fff',
                    opacity: status === 'RETURNED' ? 0.6 : 1
                  }}
                >
                  {node.sum}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar: Metrics, DP Table, Call Stack */}
        <div className="w-96 flex flex-col bg-slate-900 border-l border-slate-800 shrink-0 z-10 shadow-2xl">
          
          {/* Metrics Panel */}
          <div className="p-5 border-b border-slate-800 bg-slate-900/50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Real-Time Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-[10px] text-slate-400 uppercase">Total Calls</div>
                <div className="text-xl font-mono font-bold text-blue-400">{metrics.calls}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-[10px] text-slate-400 uppercase">Max Depth</div>
                <div className="text-xl font-mono font-bold text-purple-400">{metrics.maxDepth}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-[10px] text-slate-400 uppercase">Branches Pruned</div>
                <div className="text-xl font-mono font-bold text-red-400">{metrics.pruned}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 relative overflow-hidden">
                {mode === 'DP' && metrics.hits > 0 && <div className="absolute inset-0 bg-yellow-500/10 animate-pulse pointer-events-none"></div>}
                <div className="text-[10px] text-slate-400 uppercase">Cache Hits</div>
                <div className="text-xl font-mono font-bold text-yellow-400">{metrics.hits}</div>
              </div>
            </div>
          </div>

          {/* DP Memoization Table (Only visible in DP mode) */}
          {mode === 'DP' && (
            <div className="flex-1 flex flex-col border-b border-slate-800 min-h-[200px]">
              <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> Memo Table
                </h3>
              </div>
              <div className="flex-1 overflow-auto p-2 bg-slate-950">
                <table className="w-full text-center text-xs font-mono border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-slate-800 p-1 bg-slate-900 text-slate-500 sticky top-0">i \ s</th>
                      {Array.from({length: target + 1}).map((_, i) => (
                        <th key={`th-${i}`} className="border border-slate-800 p-1 bg-slate-900 text-slate-400 sticky top-0">{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({length: array.length + 1}).map((_, idx) => (
                      <tr key={`tr-${idx}`}>
                        <td className="border border-slate-800 p-1 bg-slate-900 text-slate-400 font-bold">{idx}</td>
                        {Array.from({length: target + 1}).map((_, sum) => {
                          let key = `${idx}-${sum}`;
                          let val = currentMemo[key];
                          let isNewlyCached = activeTrace?.action === "CACHE_HIT" && activeTrace?.idx === idx && activeTrace?.sum === sum;
                          
                          return (
                            <td key={`td-${key}`} className={`border border-slate-800 p-1 transition-colors duration-300
                              ${val === true ? 'text-green-400 bg-green-900/20' : ''}
                              ${val === false ? 'text-red-400 bg-red-900/20' : ''}
                              ${isNewlyCached ? 'bg-yellow-600 text-white font-bold scale-110 shadow-lg' : ''}
                              ${val === undefined ? 'text-slate-700' : ''}
                            `}>
                              {val === true ? 'T' : val === false ? 'F' : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Call Stack Console */}
          <div className={`${mode === 'DP' ? 'flex-1' : 'flex-[2]'} flex flex-col min-h-0 bg-slate-950`}>
             <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center sticky top-0">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Active Call Stack
                </h3>
                <span className="text-xs text-slate-500 font-mono">Depth: {callStack.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {callStack.length === 0 && <div className="text-slate-600 text-xs text-center italic mt-4">Stack is empty</div>}
                {callStack.map((frame, index) => (
                  <div key={frame.id} className={`p-2 rounded border border-blue-800 bg-blue-900/20 text-xs font-mono shadow-sm
                    ${index === 0 ? 'border-l-4 border-l-blue-400 bg-blue-900/40' : 'opacity-70'}`}>
                    <div className="flex justify-between text-blue-200">
                      <span>solve(idx: <span className="text-white">{frame.idx}</span>, sum: <span className="text-white">{frame.sum}</span>)</span>
                    </div>
                    {index === 0 && activeTrace?.action && (
                      <div className={`mt-1 text-[10px] font-bold uppercase tracking-wider
                        ${activeTrace.action === 'PRUNE' ? 'text-red-400' : ''}
                        ${activeTrace.action === 'CACHE_HIT' ? 'text-yellow-400' : ''}
                        ${activeTrace.action === 'SUCCESS' ? 'text-green-400' : ''}
                        ${activeTrace.action === 'CALL' ? 'text-blue-400' : ''}
                      `}>
                        > {activeTrace.action}
                      </div>
                    )}
                  </div>
                ))}
              </div>
          </div>
        </div>
      </div>

      {/* Footer / Controls Toolbar */}
      <footer className="h-20 bg-slate-900 border-t border-slate-800 flex items-center px-6 shrink-0 gap-6 z-20">
        
        {/* Playback Actions */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (currentStep >= engineData.trace.length - 1) setCurrentStep(0);
              setIsPlaying(!isPlaying);
            }}
            className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-colors"
          >
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>
          
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button 
              onClick={() => { setIsPlaying(false); setCurrentStep(0); panZoom.resetZoom(); }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Restart"
            >
              <IconRefresh />
            </button>
            <button 
              onClick={() => { setIsPlaying(false); setCurrentStep(Math.max(0, currentStep - 1)); }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              disabled={currentStep === 0}
            >
              <IconStepBack />
            </button>
            <button 
              onClick={() => { setIsPlaying(false); setCurrentStep(Math.min(engineData.trace.length - 1, currentStep + 1)); }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              disabled={currentStep >= (engineData?.trace.length || 0) - 1}
            >
              <IconStepFwd />
            </button>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1 flex flex-col justify-center relative">
          <div className="flex justify-between text-[10px] text-slate-500 font-mono font-bold uppercase mb-1">
            <span>Step {currentStep}</span>
            <span>Total Steps: {engineData.trace.length - 1}</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max={engineData.trace.length - 1} 
            value={currentStep}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStep(parseInt(e.target.value));
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 outline-none"
          />
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-2 border-l border-slate-700 pl-6">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Speed</span>
          <div className="flex bg-slate-800 rounded-md border border-slate-700 overflow-hidden text-xs font-mono">
            {['0.5x', '1x', '2.5x', 'MAX'].map((label, i) => (
              <button
                key={label}
                onClick={() => setSpeedIdx(i)}
                className={`px-3 py-1.5 transition-colors ${speedIdx === i ? 'bg-slate-600 text-white font-bold shadow-inner' : 'text-slate-400 hover:bg-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

      </footer>

      {/* Global Styles for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%) translateX(0); }
          20% { transform: translate(-50%, -50%) translateX(-5px); }
          40% { transform: translate(-50%, -50%) translateX(5px); }
          60% { transform: translate(-50%, -50%) translateX(-3px); }
          80% { transform: translate(-50%, -50%) translateX(3px); }
        }
      `}} />
    </div>
  );
}
