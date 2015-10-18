# Tessel.io Static Web Pages

This project is currently under revision. We're migrating to gulp, sass, and livereload capabilities.


##Dev

### Environment variables
Environment variables examples can be found in `.env.example`

You can also use the heroku plugin for config to pull down the environment variables from the server

Install the plug in using:

```
heroku plugins:install git://github.com/ddollar/heroku-config.git
```

Pull down the environment variables with:

```
heroku config:pull
```

`npm run dev` will automatically use the .env file you have locally. You can also export the variables to your environment manually with `export $(cat .env | xargs)`.

### Running the server locally


```
npm install
npm run dev
```

Be sure to install livereload plug-in to your chrome browser while developing.


##Gulp
Gulp is a task runner for development. While it can be used in production it's not advisable. Everything should be pre-compiled before it's pushed to heroku when using `npm run dev`

##Sass
Syntactically Awesome Style Sheets [docs](http://sass-lang.com/)

We use Foundation, which has scss and JavaScript files in its npm package.

##Jade
HTML that sucks less [docs](http://jade-lang.com/)

##Browserify

Using browserify to combined and compress js files. [docs](http://browserify.org/)

##data.json, faq.json

Currently using this for a cms. Eventually we should move to something that does that.Gulp will watch for changes in json files so when you update the json the server will reload. This is allows us to use any of these attributes if we load them in as context for jade templates.

Keep track of the size of these files as they are loaded into memory on server start. Make sure they don't start to get absurdly large.

##aws.json

To upload compressed images assets to AWS, fill out `aws.json` in accordance with <https://www.npmjs.com/package/gulp-s3>.

##Celery

Ensure you have a `.env` file.

In production, set the env variables `CELERY_URL` and `CELERY_TOKEN`.

In development, set the `TEST_CELERY_URL`, `TEST_CELERY_TOKEN`, and `TEST_CELERY_ID` variables.

##Deployment
###server
This document does says it best [Heroku git deploy](https://devcenter.heroku.com/articles/git)

First you must be sure to have [heroku toolbelt](https://toolbelt.heroku.com/) installed.

Make sure that you have these remotes to your local git clone (yes, these are legacy URLs).

```
git remote add heroku https://git.heroku.com/technical-io.git
git remote add stage https://git.heroku.com/technical-io-stage.git
```

Login to heroku using the Mitro credentials for heroku

```
heroku login
```

**We only ever deploy the master branch to the production server.**
To deploy to production:
```
git push heroku master
```

To deploy to stage:
```
git push stage [branch-name]:master
```


And that's it, Heroku is awesome. (except when it doesn't put node in the environment path)

**Be sure the environment variables are set on the server.**

Specifically these and everything in .env.example

```
PATH = bin:node_modules/.bin:/usr/local/bin:/usr/bin:/bin
NODE_ENV = production
NPM_CONFIG_PRODUCTION = false
```

###Images and Scripts
Be sure to install the AWS cli
[install aws cli](http://docs.aws.amazon.com/cli/latest/userguide/installing.html)

Safest way is to use the bundler if you're on Linux or OS X [installing on linux](http://docs.aws.amazon.com/cli/latest/userguide/installing.html#install-bundle-other-os)

include an aws.json file

```
{
  "accessKeyID": "Tessel-accessID",
  "secretAccessKey": "Tessel-secret-access-key",
  "bucket": "technicalmachine-assets/launch"
}
```

commands to download assets
```
gulp images-download
```
command to encoding optimize and upload images

```
gulp images-upload
```
