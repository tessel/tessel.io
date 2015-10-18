function updateBackerSurveyView() {

	// Get information about the backer from cookies or whatever
	var backer = getBackerInfo(1);
	console.log(backer);

	// Display greeting and survey instructions
	displayHeader(backer);

	// Show the reward options
	displayRewardOptions(backer);

	// make the master pack count down
	// $('#master_pack_number');
	
}

function displayHeader(backer) {

}

function displayRewardOptions(backer) {

	switch(backer.backingLevel) {
		case backer.BackerLevelEnum.TESSEL_CLASS_A_EARLY:
		case backer.BackerLevelEnum.TESSEL_CLASS_A:
			console.log("Yep!!");
			break;
		case backer.BackerLevelEnum.TESSEL_CLASS_B:
			console.log("Nope!");
	}
}


function getBackerInfo(id) {

	// Search our backend for backing level

	// return new Backer(getBackerName(id), getBackerEmail(id), getBackerLevel(id), getBackerQuantity(id));
	return new Backer("John Doe","john.doe@gmail.com", "One Tessel + One Class B Module", 5 );
}

function Backer(name, email, backingLevelString, quantity) {
	this.name = name;
	this.email = email;
	this.backingLevel = this.enumForBackerLevelString(backingLevelString);
	this.backingLevelString = backingLevelString
	this.quantity = quantity;
}

Backer.prototype.enumForBackerLevelString = function(backerLevelString) {
	switch (backerLevelString) {
		case ("Tessel + One Class A Module (Early Bird)"):
			return this.BackerLevelEnum.TESSEL_CLASS_A_EARLY;
			break;
		case ("One Tessel + One Class A Module"):
			return this.BackerLevelEnum.TESSEL_CLASS_A;
			break;
		case ("One Tessel + One Class B Module"):
			return this.BackerLevelEnum.TESSEL_CLASS_B;
			break;
		case ("The Master Pack"):
			return this.BackerLevelEnum.MASTER_PACK;
			break;
		case ("Tessel T-Shirt	"):
			return this.BackerLevelEnum.T_SHIRT;
			break;
		case ("Class A Tessel Modules"):
			return this.BackerLevelEnum.CLASS_A;
			break;
		case ("Class B Tessel Modules"):
			return this.BackerLevelEnum.CLASS_B;
			break;
		case ("Beta Test Tessel Pack"):
			return this.BackerLevelEnum.BETA;
			break;
		case ("Time With The Team"):
			return this.BackerLevelEnum.TEAM_TIME;
			break;
		case ("Thank you!"):
			return this.BackerLevelEnum.DONATION;
			break;
		default:
			throw new UserException("Invalid Backer Level String!");
			break;

	}
}

Backer.prototype.BackerLevelEnum = {
	TESSEL_CLASS_A_EARLY: 0,
	TESSEL_CLASS_A: 1,
	TESSEL_CLASS_B: 2,
	MASTER_PACK: 3,
	T_SHIRT: 4,
	CLASS_A: 5,
	CLASS_B: 6,
	BETA: 7,
	TEAM_TIME: 8,
	DONATION: 9

}

function UserException(message) {
   this.message = message;
   this.name = "UserException";
}

document.onload = updateBackerSurveyView();