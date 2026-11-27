'use client';
import { useEffect, useRef } from 'react';
import { SilkSculpture } from './silk-sculpture';

// One indexed parametric surface, no textures, assets, render targets or dependencies.
const vertex = `
precision highp float;
attribute vec2 uv;
uniform float time;
uniform vec2 pointer;
varying vec3 normal;
varying vec3 position;
vec3 surface(vec2 q) {
  float u=q.x, v=q.y, t=time;
  float radius=.88+.10*cos(3.*u+t*.35)+.045*sin(2.*u-t*.23);
  float twist=.65*sin(u+t*.18)+u;
  float a=.29+.045*sin(2.*u+t*.42);
  float b=.22+.04*cos(3.*u-t*.31);
  float radial=a*cos(v)*cos(twist)-b*sin(v)*sin(twist);
  float depth=a*cos(v)*sin(twist)+b*sin(v)*cos(twist);
  vec3 p=vec3((radius+radial)*cos(u),(radius+radial)*sin(u),depth+.13*sin(2.*u+t*.3));
  float x=.45+.23*sin(t*.24)+pointer.y*.14;
  float y=-.35+.32*sin(t*.19)+pointer.x*.2;
  float z=-.35+.14*sin(t*.16);
  p.yz=mat2(cos(x),-sin(x),sin(x),cos(x))*p.yz;
  p.xz=mat2(cos(y),-sin(y),sin(y),cos(y))*p.xz;
  p.xy=mat2(cos(z),-sin(z),sin(z),cos(z))*p.xy;
  return p;
}
void main() {
  vec3 p=surface(uv);
  normal=normalize(cross(surface(uv+vec2(.002,0.))-p,surface(uv+vec2(0.,.002))-p));
  position=p;
  float perspective=3.8/(3.8-p.z);
  gl_Position=vec4(p.xy*.54*perspective, -p.z*.25, 1.);
}`;
const fragment = `
precision mediump float;
varying vec3 normal;
varying vec3 position;
void main() {
  vec3 n=normalize(normal), view=normalize(vec3(0.,0.,3.8)-position);
  vec3 light=normalize(vec3(-1.3,1.8,2.));
  float diffuse=max(dot(n,light),0.);
  float rim=pow(1.-max(dot(n,view),0.),2.5);
  float sheen=pow(max(dot(n,normalize(light+view)),0.),32.);
  float soft=pow(max(dot(n,normalize(vec3(.8,-.6,1.5)+view)),0.),9.);
  vec3 base=mix(vec3(.19,.075,.32),vec3(.45,.27,.67),diffuse);
  vec3 color=base+vec3(.49,.40,.60)*diffuse*.45;
  color+=vec3(.92,.79,1.)*sheen*.38+vec3(.32,.14,.29)*soft;
  color+=vec3(.41,.22,.59)*rim*.45;
  color*=.86+.14*smoothstep(-.8,.6,position.z);
  gl_FragColor=vec4(color,1.);
}`;

export function Sculpture3D({ paused }: { paused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const pause = useRef(paused);
  const syncRef = useRef<() => void>(() => {});
  useEffect(() => { pause.current = paused; syncRef.current(); }, [paused]);
  useEffect(() => {
    const root = ref.current!, canvas = root.querySelector('canvas')!;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!; shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram()!;
    if (!vs || !fs) { shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program); return; }
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program); return; }
    gl.useProgram(program);
    const points = [], indices = [], rings = 128, sides = 40;
    for (let i=0;i<=rings;i++) for(let j=0;j<=sides;j++) points.push(i/rings*Math.PI*2,j/sides*Math.PI*2);
    for (let i=0;i<rings;i++) for(let j=0;j<sides;j++) {
      const a=i*(sides+1)+j,b=a+sides+1; indices.push(a,b,a+1,b,b+1,a+1);
    }
    const vertices = gl.createBuffer(), elements = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
    const attr=gl.getAttribLocation(program,'uv'); gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,0);
    const timeUniform=gl.getUniformLocation(program,'time'), pointerUniform=gl.getUniformLocation(program,'pointer');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0, last=0, time=0, visible=true, lost=false, px=0, py=0, tx=0, ty=0;
    function draw() {
      if (lost) return;
      gl!.clear(gl!.COLOR_BUFFER_BIT|gl!.DEPTH_BUFFER_BIT);
      gl!.uniform1f(timeUniform,reduced.matches?0:time); gl!.uniform2f(pointerUniform,px,py);
      gl!.drawElements(gl!.TRIANGLES,indices.length,gl!.UNSIGNED_SHORT,0);
      root.dataset.frame=String(Math.round(time*1000));
    }
    function running() { return !pause.current && !reduced.matches && visible && !document.hidden && !lost; }
    function tick(now: number) {
      frame=0;
      if (!running()) return;
      // Cap at 30fps and avoid jumps after a hidden tab or long browser task.
      if (!last || now-last>=32) {
        time+=last?Math.min((now-last)/1000,.06):0; last=now;
        px+=(tx-px)*.07; py+=(ty-py)*.07; draw();
      }
      frame=requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame); frame=0; last=0;
      if (reduced.matches) { px=py=tx=ty=0; draw(); }
      root.dataset.running=String(running());
      if (running()) frame=requestAnimationFrame(tick);
    }
    const resize=new ResizeObserver(() => {
      const size=Math.max(1,Math.min(1100,Math.round(root.clientWidth*Math.min(devicePixelRatio,1.5))));
      canvas.width=canvas.height=size; gl.viewport(0,0,size,size); draw();
    }); resize.observe(root);
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}); observer.observe(root);
    const move=(e: PointerEvent)=>{if(!running()||e.pointerType!=='mouse')return;const b=root.getBoundingClientRect();tx=(e.clientX-b.left)/b.width-.5;ty=(e.clientY-b.top)/b.height-.5;};
    const leave=()=>{tx=ty=0;};
    const contextLost=(e: Event)=>{e.preventDefault();lost=true;delete root.dataset.ready;sync();};
    root.addEventListener('pointermove',move); root.addEventListener('pointerleave',leave);
    canvas.addEventListener('webglcontextlost',contextLost);
    document.addEventListener('visibilitychange',sync); reduced.addEventListener('change',sync);
    root.dataset.ready='true'; syncRef.current=sync; sync();
    return ()=>{
      cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();syncRef.current=()=>{};
      root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',leave);
      canvas.removeEventListener('webglcontextlost',contextLost);
      document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);
      gl.deleteBuffer(vertices);gl.deleteBuffer(elements);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));
      delete root.dataset.ready;
    };
  }, []);
  return <div className="sculpture-3d" ref={ref}><SilkSculpture/><canvas aria-hidden="true"/></div>;
}
