const arg = require('arg');
const Bundler = require('parcel-bundler');
const config = require('./package');
const fs = require('fs-extra');
const glob = require('glob');
const git = require('simple-git/promise');
const mime = require('mime-types');


// arg handling
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


// build helpers
const log = str => console.log('[make]', str);


// build website
(async () => {
    // list which contains strings to be replaced in generated HTML
    const replaceList = [];


    log('create public folder if missing and make sure it is empty');
    fs.emptyDirSync('public');


    log('copy assets');
    fs.copySync('assets', 'public');


    log('configure bundler');
    await (async () => {
        const bundler = new Bundler('src/*.pug', {
            hmr: watch,
            minify: prod,
            outDir: 'public',
            publicURL: './',
            sourceMaps: !prod,
            watch,
        });

        if (watch) {
            log('write bundle to disk and serve on localhost');
            await bundler.serve();
        }
        else {
            log('write bundle to disk');
            await bundler.bundle();
        }
    })();


    log('inline critical css');
    (() => {
        const [critCSSFile] = glob.sync('public/critical*.css');
        const critCSS = fs.readFileSync(critCSSFile).toString();

        replaceList.push([
            /<link(\srel="?stylesheet"?|\shref="?\/?critical\.\w*\.css"?)+>/i,
            `<style>${critCSS}</style>`,
        ]);

        fs.unlinkSync(critCSSFile);
    })();


    log('setup dns prefetch links');
    for (let addr of config.assets["prefetch-dns"]) {
        log('    ' + addr);
        replaceList.push([/<\/head>/i, `<link rel="dns-prefetch" href="${addr}"></head>`]);
    }


    log('setup asset prefetch links');
    (() => {
        const assetFiles = glob.sync('assets/**/*');
        let assetLinkHTML = '';

        for (let file of assetFiles) {
            file = file.replace(/^assets\//i, '');

            if (!config.assets["prefetch-blacklist"].includes(file)) {
                const mimeType = config.assets["prefetch-types"][file]
                    ? config.assets["prefetch-types"][file]
                    : mime.lookup(file);
                const fileType = typeof mimeType === 'string'
                    ? mimeType.split('/')[0]
                    : 'object';

                log(`    ${file} as ${fileType}`);
                assetLinkHTML += `<link rel="prefetch" href="${file}" as="${fileType}" type="${mimeType}">`;
            }
        }

        if (assetLinkHTML !== '') {
            replaceList.push([
                /<\/head>/i,
                assetLinkHTML + '</head>'
            ]);
        }
    })();


    log('inject the change-set into all HTML files');
    (() => {
        const htmlFiles = glob.sync('public/**/*.html');

        for (let htmlFile of htmlFiles) {
            let html = fs.readFileSync(htmlFile).toString();

            for (let [searchValue, replaceValue] of replaceList) {
                html = html.replace(searchValue, replaceValue);
            }

            fs.writeFileSync(htmlFile, html);
        }
    })();


    // publish, if arg is provided
    if (args['--deploy']) {
        log('publish to github pages');

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
})().catch(console.error).finally(() => log('FINISHED'));
