/**
 * Code modified from https://vahaduo.github.io/vahaduo/
 * @param {[String, Number]} targetK13
 * @param {[String, Number][]} sourceK13s
 * @returns {Record<String, Number>}
 */
export default function predictEthnicityPercentages(targetK13, sourceK13s) {
  const result = fastMonteCarlo(
    targetK13.slice(1).map((n) => n / 500),
    sourceK13s.map((arr) => arr.slice(1).map((n) => n / 500)),
    0,
    500,
    1,
    false,
    true,
    sourceK13s.length
  );
  const { distance, scores } = result;

  return Object.fromEntries(
    scores
      .map((n, i) => [sourceK13s[i][0], n * 100])
      .sort((a, b) => b[1] - a[1])
  );
}

function fastMonteCarlo(
  target,
  source,
  targetId,
  slots,
  cyclesMultiplier,
  distColMultiplier,
  recalculate,
  sourceNum
) {
  let j,
    tempLine,
    currentSlots,
    currentPoint,
    currentDistance,
    nextSlots,
    ranking = Array(),
    nextPoint,
    nextDistance,
    previousDistance,
    rankingNum,
    dimNum = 13; //dimensions;
  const cycles = Math.ceil((sourceNum * cyclesMultiplier) / 4);
  const scores = Array(sourceNum).fill(0);
  const result = { target: targetId, distance, scores };
  const bigNumber = 100_000_000_000_000_000;
  if (distColMultiplier) {
    distColMultiplier /= 8;
    dimNum++;
    for (let i = 0; i < sourceNum; i++) {
      source[i] = subArray({ arr1: source[i], arr2: target });
      source[i].push(
        distColMultiplier * Math.sqrt(distance({ fromPoint: source[i] }))
      );
    }
  } else {
    for (let i = 0; i < sourceNum; i++) {
      source[i] = subArray({ arr1: source[i], arr2: target });
    }
  }

  if (sourceNum == 1) {
    currentSlots = Array(slots).fill(0);
    currentPoint = buildPoint({
      slots,
      dimNum,
      fromSlots: currentSlots,
      source,
    });
    currentDistance = distance({ fromPoint: currentPoint });
    scores[0] = 1;
    result.distance = Number(Math.sqrt(currentDistance).toFixed(8));
    result.scores = scores;
    return result;
  }

  currentSlots = Array(slots).fill(-1);
  currentSlots = randomizedSlots({ slots, oldSlots: currentSlots, sourceNum });
  currentPoint = buildPoint({ slots, dimNum, fromSlots: currentSlots, source });
  currentDistance = distance({ fromPoint: currentPoint });

  for (let i = 0; i < cycles; i++) {
    nextSlots = randomizedSlots({ slots, oldSlots: currentSlots, sourceNum });
    for (let j = 0; j < slots; j++) {
      nextPoint = subArray({
        arr1: currentPoint,
        arr2: source[currentSlots[j]],
      });
      nextPoint = addArray({ arr1: nextPoint, arr2: source[nextSlots[j]] });
      nextDistance = distance({ fromPoint: nextPoint });
      if (nextDistance < currentDistance) {
        currentSlots[j] = nextSlots[j];
        currentPoint = nextPoint;
        currentDistance = nextDistance;
      }
    }
  }
  for (let i = 0; i < slots; i++) {
    scores[currentSlots[i]] += 1;
  }
  for (let i = 0; i < sourceNum; i++) {
    if (scores[i] > 0) {
      ranking.push([i, scores[i]]);
    }
  }
  ranking.sort(function (a, b) {
    return b[1] - a[1];
  });
  rankingNum = ranking.length;

  function secondStage() {
    currentDistance = Math.round(bigNumber * currentDistance);
    do {
      previousDistance = currentDistance;
      for (let i = rankingNum - 1; i > -1; i--) {
        if (ranking[i][1] > 0) {
          for (let j = 0; j < rankingNum; j++) {
            if (i == j) {
              continue;
            }
            nextPoint = subArray({
              arr1: currentPoint,
              arr2: source[ranking[i][0]],
            });
            nextPoint = addArray({
              arr1: nextPoint,
              arr2: source[ranking[j][0]],
            });
            nextDistance = Math.round(
              bigNumber * distance({ fromPoint: nextPoint })
            );
            if (nextDistance < currentDistance) {
              ranking[i][1]--;
              ranking[j][1]++;
              currentPoint = nextPoint;
              currentDistance = nextDistance;
              break;
            }
          }
        }
      }
    } while (currentDistance < previousDistance);
  }
  secondStage();
  for (let i = 0; i < rankingNum; i++) {
    scores[ranking[i][0]] = ranking[i][1];
  }
  if (distColMultiplier && recalculate) {
    dimNum--;
    currentPoint.pop();
    currentDistance = distance({ fromPoint: currentPoint });
    for (let i = 0; i < sourceNum; i++) {
      source[i].pop();
    }
    ranking = [];
    for (let i = 0; i < sourceNum; i++) {
      if (scores[i] > 0) {
        ranking.push([i, scores[i]]);
      }
    }
    ranking.sort(function (a, b) {
      return b[1] - a[1];
    });
    rankingNum = ranking.length;
    secondStage();
    for (let i = 0; i < rankingNum; i++) {
      scores[ranking[i][0]] = ranking[i][1];
    }
  }

  for (let i = 0; i < sourceNum; i++) {
    scores[i] = scores[i] / slots;
  }
  if (distColMultiplier && !recalculate) {
    currentPoint.pop();
  }
  currentDistance = distance({ fromPoint: currentPoint });
  result.distance = Number(Math.sqrt(currentDistance).toFixed(8));
  result.scores = scores;
  return result;
}

function randomizedSlots({ slots, oldSlots, sourceNum }) {
  const newSlots = Array(slots);

  for (let i = 0; i < slots; i++) {
    newSlots[i] = randomFromRange({ min: 0, max: sourceNum });

    while (newSlots[i] == oldSlots[i]) {
      newSlots[i] = randomFromRange({ min: 0, max: sourceNum });
    }
  }

  return newSlots;
}

function buildPoint({ slots, dimNum, fromSlots, source }) {
  let tempLine;
  let newPoint = Array(dimNum).fill(0);

  for (let i = 0; i < slots; i++) {
    tempLine = source[fromSlots[i]].slice();
    newPoint = addArray({ arr1: newPoint, arr2: tempLine });
  }

  return newPoint;
}

function distance({ fromPoint }) {
  const dist = squareArray({ arr: fromPoint });
  return getArraySum({ arr: dist });
}

function subArray({ arr1, arr2 }) {
  const subtracted = arr1.map((elmnt, index) => {
    return elmnt - arr2[index];
  });
  return subtracted;
}

function getArraySum({ arr }) {
  function arrSum(total, num) {
    return total + num;
  }
  return arr.reduce(arrSum);
}

function addArray({ arr1, arr2 }) {
  const added = arr1.map(function (elmnt, index) {
    return elmnt + arr2[index];
  });
  return added;
}

function squareArray({ arr }) {
  const squared = arr.map(function (elmnt) {
    return elmnt * elmnt;
  });
  return squared;
}

function randomFromRange({ min, max }) {
  return Math.floor(Math.random() * (max - min)) + min;
}
