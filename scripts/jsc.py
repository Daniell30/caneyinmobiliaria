"""Ejecuta los módulos JS del sitio con JavaScriptCore (osascript, viene con
macOS), sin Node. Así los scripts manuales usan exactamente el mismo código
que el build de Netlify en vez de una copia en Python.

    import jsc
    texto = jsc.run('require("./src/_utils/redirects")...')   # devuelve JSON decodificado
"""
import json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# require() mínimo: fs y path con lo que usan los módulos de src/_utils.
PRELUDE = r"""
ObjC.import('Foundation');
var fm = $.NSFileManager.defaultManager;
function readText(p) {
  var s = $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null);
  if (s.isNil()) throw new Error("ENOENT: no such file '" + p + "'");
  return s.js;
}
function isDir(p) { var d = Ref(); return fm.fileExistsAtPathIsDirectory(p, d) && d[0]; }
var path = {
  normalize: function (p) {
    var out = [];
    p.split('/').forEach(function (s) { if (!s || s === '.') return; if (s === '..') out.pop(); else out.push(s); });
    return '/' + out.join('/');
  },
  join: function () { return path.normalize([].slice.call(arguments).join('/')); },
  dirname: function (p) { return p.slice(0, p.lastIndexOf('/')) || '/'; },
};
var fs = {
  readFileSync: function (p) { return readText(p); },
  existsSync: function (p) { return fm.fileExistsAtPath(p); },
  readdirSync: function (p) { return ObjC.deepUnwrap(fm.contentsOfDirectoryAtPathError(p, null)).sort(); },
  statSync: function (p) { var d = isDir(p); return { isDirectory: function () { return d; }, isFile: function () { return !d; } }; },
};
var cache = {};
function makeRequire(dir) {
  return function (name) {
    if (name === 'fs') return fs;
    if (name === 'path') return path;
    var full = path.join(dir, name);
    if (!/\.js(on)?$/.test(full)) full += '.js';
    if (cache[full]) return cache[full].exports;
    if (/\.json$/.test(full)) return (cache[full] = { exports: JSON.parse(readText(full)) }).exports;
    var module = cache[full] = { exports: {} };
    new Function('require', 'module', 'exports', '__dirname', readText(full))(
      makeRequire(path.dirname(full)), module, module.exports, path.dirname(full));
    return module.exports;
  };
}
var console = { warn: function () {}, log: function () {} };
var require = makeRequire(ROOT);
"""


def run(expression):
    """Evalúa `expression` (JS, con require() relativo a la raíz del repo) y
    devuelve su valor decodificado desde JSON."""
    script = (f"var ROOT = {json.dumps(ROOT)};\n{PRELUDE}\n"
              f"function run() {{ return JSON.stringify({expression}); }}")
    out = subprocess.run(["osascript", "-l", "JavaScript", "-e", script],
                         capture_output=True, text=True, timeout=300)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip())
    return json.loads(out.stdout)


def redirects():
    """El contenido de _redirects que genera el build."""
    return run('require("./src/_utils/redirects").buildRedirects('
               'require("./src/_utils/catalogo").loadProperties(), '
               'require("./scripts/rename-map.json"), '
               'require("./scripts/legacy-slugs.json"))')
