#
# This file is the default set of rules to compile a Pebble project.
#
# Feel free to customize this to your needs.
#

import os.path

top = '.'
out = 'build'

from sh import uglifyjs

def concatenate_js(task):
  inputs = (input.abspath() for input in task.inputs)
  uglifyjs(*inputs, o=task.outputs[0].abspath())
	

def options(ctx):
    ctx.load('pebble_sdk')

def configure(ctx):
    ctx.load('pebble_sdk')

def build(ctx):
    ctx.load('pebble_sdk')

    js_libs = [
        '../src/js/libs/hmac-sha1.js'
		]

    js_sources = [
        '../src/js/private/keyInfo.js',
        '../src/js/private/configInfo.js',
        '../src/js/main.js'
		]
    built_js = '../src/js/pebble-js-app.js'

    build_worker = os.path.exists('worker_src')
    binaries = []
		
    ctx(rule=concatenate_js, source=' '.join(js_sources + js_libs), target=built_js)
		

    for p in ctx.env.TARGET_PLATFORMS:
        ctx.set_env(ctx.all_envs[p])
        ctx.set_group(ctx.env.PLATFORM_NAME)
        app_elf='{}/pebble-app.elf'.format(ctx.env.BUILD_DIR)
        ctx.pbl_program(source=ctx.path.ant_glob('src/**/*.c'),
        target=app_elf)

        if build_worker:
            worker_elf='{}/pebble-worker.elf'.format(ctx.env.BUILD_DIR)
            binaries.append({'platform': p, 'app_elf': app_elf, 'worker_elf': worker_elf})
            ctx.pbl_worker(source=ctx.path.ant_glob('worker_src/**/*.c'),
            target=worker_elf)
        else:
            binaries.append({'platform': p, 'app_elf': app_elf})



    ctx.set_group('bundle')
    ctx.pbl_bundle(binaries=binaries, js=ctx.path.ant_glob('src/js/**/*.js'))
