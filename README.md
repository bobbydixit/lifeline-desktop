# lifeline-desktop

## How To
Follow the steps mentioned below to run the program 

### Install Node and NPM 
- MAC - https://www.newline.co/@Adele/how-to-install-nodejs-and-npm-on-macos--22782681
- Windows - https://phoenixnap.com/kb/install-node-js-npm-on-windows

### Clone this repository 
- Using Git - git clone https://github.com/bobbydixit/lifeline-desktop.git
- Download Zip - GoTo https://github.com/bobbydixit/lifeline-desktop -> click on download code -> click on download as zip

### Setup the env

Open terminal

Go to the folder where you have downloaded the code ` cd path_to_your_folder`

Update config.json - you can update using notepad/any document editor you have
- userPhoneNumber - your phone number without country code
- beneficiaryId - beneficiary id in cowin 
- districtId - your districtId, please approach owner to find your districtId

run `npm i` to install all dependencies 

### Run 
Please follow the following steps to run
- Get your mobile number whitelisted by the owner
- Open the android app shared by the owner
- Enter phone number on lifeline app
- Click on submit on the app
- Wait for app to be initialized
- Run `node schedular.js` on desktop
- Let process run in background

### How to terminate node js app

- Mac `Ctrl + C`
- Windows `Ctrl + C`



