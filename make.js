const arg = require('arg');
const Bundler = require('parcel-bundler');
const fs = require('fs-extra');
const git = require('simple-git/promise');


const args = arg({
    '--deploy': Boolean,
    '--production': Boolean,
    '--watch': Boolean,

    '-d': '--deploy',
    '-p': '--production',
    '-w': '--watch',
});
const prod = !!args['--production'];
const watch = !!args['--watch'];

(async () => {
    // create public folder if missing and make sure it is empty
    fs.emptyDirSync('public');


    // copy assets
    fs.copySync('assets', 'public');


    // build src
    const bundler = new Bundler('src/*.pug', {
        hmr: watch,
        minify: prod,
        outDir: 'public',
        sourceMaps: !prod,
        watch,
    });

    if (watch) {
        await bundler.serve();
    }
    else {
        await bundler.bundle();
    }


    // publish, if arg is provided
    if (args['--deploy']) {
        // todo: make sure everything is committed
        // todo: delete local gh-pages branch if exists

        await git('.').raw([
            'subtree',
            'split',
            '--prefix', 'public',
            '-b', 'gh-pages',
        ]);
        await git('.').push('origin', 'gh-pages:gh-pages', { '-f': null });
        await git('.').raw([
            'branch',
            '-D', 'gh-pages'
        ]);
    }
})().catch(console.error);
