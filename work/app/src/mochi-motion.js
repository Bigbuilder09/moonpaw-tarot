// Animate the original painting in image coordinates, keeping the room stationary.
export function initMochiMotion(img, room) {
  const canvas = document.createElement('canvas');
  canvas.className = 'mochi-motion';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return; // The original image is always the fallback.
  const shader = (type, source) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `attribute vec2 a; varying vec2 uv;
      void main(){uv=vec2((a.x+1.0)*0.5,(1.0-a.y)*0.5);gl_Position=vec4(a,0.,1.);}`));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `precision highp float;
      varying vec2 uv; uniform sampler2D painting; uniform float time; uniform float portrait;
      float area(vec2 p,vec2 c,vec2 r){return 1.0-smoothstep(0.25,1.0,length((p-c)/r));}
      vec2 blink(vec2 p,vec2 c,vec2 r,float b){
        vec2 d=(p-c)/r;
        float mask=1.0-smoothstep(0.45,1.0,length(d));
        p.y+=sign(d.y)*r.y*b*mask*0.85;
        return p;
      }
      void main(){
        vec2 head=mix(vec2(.484,.395),vec2(.494,.395),portrait);
        vec2 radius=mix(vec2(.118,.17),vec2(.215,.145),portrait);
        vec2 p=uv;
        float h=area(p,head,radius);
        float breath=sin(time*1.65);
        p.y+=h*(.0022*breath);
        p.x+=h*(.0025*sin(time*.72));
        float body=area(p,mix(vec2(.48,.51),vec2(.49,.49),portrait),mix(vec2(.12,.06),vec2(.20,.07),portrait));
        p.y+=body*.0015*breath;
        float cycle=mod(time,6.7);
        float b=(1.0-smoothstep(.035,.15,abs(cycle-3.4)));
        b=max(b,(1.0-smoothstep(.025,.12,abs(cycle-3.76)))*.8);
        vec2 eyeL=mix(vec2(.447,.394),vec2(.433,.400),portrait);
        vec2 eyeR=mix(vec2(.515,.402),vec2(.551,.408),portrait);
        vec2 eyeSize=mix(vec2(.023,.031),vec2(.038,.026),portrait);
        p=blink(p,eyeL,eyeSize,b);p=blink(p,eyeR,eyeSize,b);
        gl_FragColor=texture2D(painting,p);
      }`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Mochi shader link failed');
  } catch (error) { console.warn('Mochi motion unavailable', error); return; }
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const attr = gl.getAttribLocation(program, 'a'); gl.enableVertexAttribArray(attr);
  gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const time = gl.getUniformLocation(program, 'time');
  const portrait = gl.getUniformLocation(program, 'portrait');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  room.insertBefore(canvas, img.nextSibling);
  let ready = false, frame = 0, elapsed = 0, last = 0, lost = false;
  function stop() { cancelAnimationFrame(frame); frame = 0; last = 0; }
  function tick(now) {
    if (!ready || lost || reduced.matches || document.hidden || room.classList.contains('hidden')) { stop(); return; }
    if (!last || now-last >= 1000/30) {
      elapsed += last ? Math.min(now-last, 100)/1000 : 0;
      last = now;
      gl.uniform1f(time, elapsed); gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    canvas.hidden = !ready || lost || reduced.matches;
    if (canvas.hidden || document.hidden || room.classList.contains('hidden')) stop();
    else if (!frame) frame = requestAnimationFrame(tick);
  }
  function upload() {
    if (!img.complete || !img.naturalWidth || lost) return;
    try {
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.uniform1f(portrait, img.naturalHeight > img.naturalWidth ? 1 : 0);
      gl.uniform1f(time, elapsed); gl.drawArrays(gl.TRIANGLES, 0, 6);
      ready = true; sync();
    } catch (error) { ready = false; sync(); }
  }
  img.addEventListener('load', upload);
  img.addEventListener('error', () => { ready = false; sync(); });
  new MutationObserver(() => { ready = false; sync(); upload(); }).observe(img, { attributes: true, attributeFilter: ['src'] });
  new MutationObserver(sync).observe(room, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); lost = true; sync(); });
  canvas.addEventListener('webglcontextrestored', () => { canvas.remove(); initMochiMotion(img, room); });
  upload(); sync();
}
