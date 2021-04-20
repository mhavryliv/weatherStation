function getNthEvent(events, index) {
  return events[index];
}

module.exports.getNthEvent = getNthEvent;

function getMostRecentHalfHourIndex(events) {
  // add 10 hours to get into my timezone for debugging
  // const offset = 1000 * 60 * 60 * 10;
  // start from the end of the data, and look for either 0 or 30 min
  let roundedTimeMap = {}
  for(let i = 0; i < events.length; ++i) {
    let event = events[i];
    const time = event.time;
    let dateTime = new Date(time);
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
    // console.log(dateTime + " becomes " + roundedTime);
    // console.log(roundedTime);
    if(!roundedTimeMap[roundedTime]) {
      roundedTimeMap[roundedTime] = i;
    }
    else {
      const previousClosestTime = events[roundedTimeMap[roundedTime]].time;
      const prevDiff = Math.abs(previousClosestTime - roundedTime.getTime());
      const curDiff = Math.abs(time - roundedTime.getTime());
      if(curDiff < prevDiff) {
        roundedTimeMap[roundedTime] = i;
      }
    }

  }

  const roundedTimes = Object.keys(roundedTimeMap);
  for(var i = 0; i < roundedTimes.length; ++i) {
    console.log(roundedTimes[i])
    console.log(new Date(events[roundedTimeMap[roundedTimes[i]]].time))
  }

  return -1;
}

module.exports.getMostRecentHalfHourIndex = getMostRecentHalfHourIndex;