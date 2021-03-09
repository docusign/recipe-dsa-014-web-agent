# recipe-dsa-014-web-agent
DocuSign Signature Appliance recipe for integrating with the Web Agent

## Run the recipe on Heroku
The recipe source can be run on [Heroku](https://www.heroku.com/) using the free service level. No credit card needed!

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

### Get Ready
* You will need a free account on the Developer Sandbox Docusign Signature Appliance. Contact DocuSign to receive an account. 

### How to do it
* Create a free account on [Heroku](https://www.heroku.com/)
* Press the Heroku deploy button (above)
* The Heroku dashboard will open. Click the *Deploy for Free* button.
* Scroll down the page. Click the *View* button at the bottom of the page when it is enabled.

## Run the recipe on your own server

### Get Ready
* You will need a free account on the Developer Sandbox Docusign Signature Appliance. Contact DocuSign to receive an account. 
* Your server needs Node.JS 4.2.2 or later

### How to do it
```sh
% git clone https://github.com/docusign/recipe-dsa-014-web-agent.git
% cd the_repo
% npm install
% cp example-configuration.js configuration.js
% //modify the configureation.js file and update it with your session secret
% nano configuration.js
% //use ctrl+o to save and ctrl+q to quit.
% npm start
```
