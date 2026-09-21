import sys,json,base64,pathlib,subprocess,os,tempfile
ROOT=pathlib.Path('/workspace')
def safe(name):
 p=pathlib.PurePosixPath(name)
 if p.is_absolute() or '..'in p.parts or not p.parts or any(x.startswith('.')for x in p.parts):raise ValueError('Invalid workspace path')
 return ROOT.joinpath(*p.parts)
try:
 request=json.loads(sys.stdin.buffer.read(5*1024*1024))
 for f in request.get('files',[]):
  p=safe(f['name']);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(base64.b64decode(f['base64'],validate=True))
 script=ROOT/('_task.py'if request.get('language','python')=='python'else '_task.sh');script.write_text(request['code'])
 # File-backed stdout/stderr are bounded by the container's 32 MiB workspace tmpfs.
 with tempfile.TemporaryFile(dir='/workspace')as out,tempfile.TemporaryFile(dir='/workspace')as err:
  proc=subprocess.run(['python','-I',str(script)]if request.get('language','python')=='python'else ['/bin/sh',str(script)],cwd=ROOT,stdin=subprocess.DEVNULL,stdout=out,stderr=err,timeout=45,env={'PATH':'/usr/local/bin:/usr/bin:/bin','HOME':'/tmp','LANG':'C.UTF-8'})
  out.seek(0);err.seek(0);stdout=out.read(12000).decode(errors='replace');stderr=err.read(6000).decode(errors='replace')
 files=[];size=0
 for p in sorted(ROOT.rglob('*')):
  if p.name in ['_task.py','_task.sh']or p.is_symlink()or not p.is_file()or any(x.startswith('.')for x in p.relative_to(ROOT).parts):continue
  if not p.resolve().is_relative_to(ROOT):raise ValueError('Output path escapes workspace')
  data=p.read_bytes();size+=len(data)
  if size>6*1024*1024 or len(files)>=40:raise ValueError('Output artifact limit exceeded')
  files.append({'name':str(p.relative_to(ROOT)),'base64':base64.b64encode(data).decode()})
 print(json.dumps({'exitCode':proc.returncode,'stdout':stdout,'stderr':stderr,'files':files}))
except Exception as e:
 print(json.dumps({'exitCode':1,'stdout':'','stderr':str(e)[:2000],'files':[]}))
