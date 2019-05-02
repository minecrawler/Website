import arg from 'arg';
import Bundler from 'parcel-bundler';
import fs from 'fs-extra';
import git from 'simple-git/promise';


const args = arg({
    '--deploy': Boolean,
    '--production': Boolean,
    '--watch': Boolean,

    '-d': '--deploy',
    '-p': '--production',
    '-w': '--watch',
});

(async () => {
    // create public folder if missing and make sure it is empty
    fs.emptyDirSync('public');


    // build src
    const bundler = new Bundler('src/*.pug', {
        minify: !!args['--production'],
        outDir: 'public',
        sourceMaps: !args['--production'],
        watch: !!args['--watch'],
    });
    await bundler.bundle();


    // copy assets
    fs.copySync('assets', 'public');


    // todo: publish, if arg is provided
    if (args['--deploy']) {
        await git('.').raw([
            'subtree',
            'push',
            '--prefix', 'public',
            'origin',
            'gh-pages',
        ]);
    }
})().catch(console.error);
