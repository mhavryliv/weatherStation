function getNthEvent(events, index) {
  return events[index];
}

module.exports.getNthEvent = getNthEvent;

function getMostRecentHalfHourIndex(events) {
  // add 10 hours to get into my timezone for debugging
  // const offset = 1000 * 60 * 60 * 10;
  // start from the end of the data, and look for either 0 or 30 min
  let closestHalfHourIndex = -1;
  for(let i = 0; i < events.length; ++i) {
    let event = events[i];
    const time = event.time;
    let dateTime = new Date(time);
    dateTime.setHours(dateTime.getHours() + 10)
    const minutes = dateTime.getMinutes();
    let roundedTime = new Date(dateTime);
    roundedTime.setSeconds(0);
    if(minutes < 15) {
      roundedTime.setMinutes(0);
    }
    else if(minutes < 45) {
      roundedTime.setMinutes(30)
    }
    else {
      roundedTime.setMinutes(0);
      roundedTime.setHours(roundedTime.getHours() + 1)
    }
    console.log(dateTime + " becomes " + roundedTime);
    // console.log(roundedTime);



    // console.log(dateTime)
  }
  return -1;
}

module.exports.getMostRecentHalfHourIndex = getMostRecentHalfHourIndex;