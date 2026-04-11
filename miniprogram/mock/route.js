const routeCandidates = [
  {
    id: 'route-1',
    summary: '路线1：15号线（紫竹高新区 至 娄山关路），换乘 2号线（娄山关路 至 虹桥2号航站楼），含卫生间站点 6 个',
    toiletStationCount: 6,
  },
  {
    id: 'route-2',
    summary: '路线2：15号线（紫竹高新区 至 桂林路），换乘 9号线（桂林路 至 中春路），换乘 2号线（虹桥火车站 至 虹桥2号航站楼），含卫生间站点 8 个',
    toiletStationCount: 8,
  },
]

const routeToiletStations = {
  'route-1': [
    { stationId: '1521', stationName: '紫竹高新区', stationLineLabels: ['15号线'], legendTypes: ['inside_toilet', 'inside_accessible'] },
    { stationId: '1528', stationName: '景洪路', stationLineLabels: ['15号线', '51号线'], legendTypes: ['inside_toilet', 'inside_accessible', 'outside_toilet'] },
    { stationId: '1538', stationName: '娄山关路', stationLineLabels: ['2号线', '15号线'], legendTypes: ['inside_toilet', 'inside_accessible', 'outside_toilet', 'outside_accessible'] },
    { stationId: '0241', stationName: '中山公园', stationLineLabels: ['2号线', '3号线', '4号线'], legendTypes: ['inside_toilet', 'inside_accessible'] },
    { stationId: '0235', stationName: '虹桥火车站', stationLineLabels: ['2号线', '10号线', '17号线'], legendTypes: ['inside_toilet', 'inside_accessible', 'outside_toilet'] },
    { stationId: '0236', stationName: '虹桥2号航站楼', stationLineLabels: ['2号线', '10号线', '市域机场线'], legendTypes: ['inside_toilet', 'inside_accessible'] },
  ],
  'route-2': [
    { stationId: '1521', stationName: '紫竹高新区', stationLineLabels: ['15号线'], legendTypes: ['inside_toilet', 'inside_accessible'] },
    { stationId: '1534', stationName: '桂林路', stationLineLabels: ['9号线', '15号线'], legendTypes: ['inside_toilet', 'inside_accessible'] },
    { stationId: '0927', stationName: '中春路', stationLineLabels: ['9号线', '51号线'], legendTypes: ['inside_toilet', 'inside_accessible'] },
    { stationId: '0235', stationName: '虹桥火车站', stationLineLabels: ['2号线', '10号线', '17号线'], legendTypes: ['inside_toilet', 'inside_accessible', 'outside_toilet'] },
    { stationId: '0236', stationName: '虹桥2号航站楼', stationLineLabels: ['2号线', '10号线', '市域机场线'], legendTypes: ['inside_toilet', 'inside_accessible'] },
  ],
}

module.exports = {
  routeCandidates,
  routeToiletStations,
}
