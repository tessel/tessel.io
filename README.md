# tessel.io website
[![Code of Conduct](https://img.shields.io/badge/%E2%9D%A4-code%20of%20conduct-blue.svg?style=flat)](https://github.com/tessel/project/blob/master/CONDUCT.md)

This is the website codebase for [tessel.io](//tessel.io). Contributions welcome.

* [Development](#Development)
* [Deployment](#Deployment)

## Development

This repo is built on gulp, sass, and livereload.

### Environment variables
Environment variables examples can be found in `.env.example`

`npm run dev` will automatically use the .env file you have locally. You can also export the variables to your environment manually with `export $(cat .env | xargs)`.

Production env is stored in the password management. It should live in `/mnt/secrets/tessel-env.json` on the server the currently used keys are set in the .env.example file.

### Running the server locally

**Using Node.js && npm**

Check the package.json file for the supported versions of Node.js and npm to build this project.

```
npm install
npm run build
npm run dev
```

Be sure to install livereload plug-in to your chrome browser while developing.

**Using Docker**

Get the Docker tooling for your platform of choice:

- [Docker for Mac](https://docs.docker.com/docker-for-mac/install/)
- [Docker for Windows 10](https://docs.docker.com/docker-for-windows/install/)
- [Docker for Linux](https://docs.docker.com/install/#server) (Links to options for CentOS, Debian, Fedora, Ubuntu)

Run `docker-compose up -d` to build the Docker image and start the Node.js server in the background. This could take some time as it will install all the npm dependencies and run `npm run build` within the container.

Open `http://localhost:5000` to see the site running locally. Run `docker-compose logs -f app` to follow the server logs from the container.

When changing any of the server code, i.e. `index.js`, run `docker-compose restart` to restart the application. However, this is not required when changing anything within the `views/` directory as it is linked to the running container and will pick up changes without restarting or rebuilding.

### Tools used in this repo

#### Gulp
Gulp is a task runner for development. While it can be used in production it's not advisable. Everything should be pre-compiled before it's pushed to heroku when using `npm run dev`

#### Sass
Syntactically Awesome Style Sheets [docs](http://sass-lang.com/)

We use Foundation, which has scss and JavaScript files in its npm package.

#### Jade
HTML that sucks less [docs](http://jade-lang.com/)

#### Browserify

Using browserify to combined and compress js files. [docs](http://browserify.org/)

#### data.json, faq.json

Currently using this for a cms. Eventually we should move to something that does that. Gulp will watch for changes in json files so when you update the json the server will reload. This allows us to use any of these attributes if we load them in as context for jade templates.

Keep track of the size of these files as they are loaded into memory on server start. Make sure they don't start to get absurdly large.

#### aws.json

To upload compressed images assets to AWS, fill out `aws.json` in accordance with <https://www.npmjs.com/package/gulp-s3>.

## Deployment

### Automated Deployment

A Bocoup run [Hookshot](https://github.com/brianloveswords/hookshot) instance is configured to deploy commits taged with `prod-xxx` to production. Where `xxx` is an incrementing version number. You can see the results of a deploy in the [webhook response tab](https://github.com/tessel/tessel.io/settings/hooks/6699959#delivery-response) of this repo.

### AWS

### Ansible


### Images and Scripts
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
