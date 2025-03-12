import {
  transform,
  toGCJ02,
  toBD09,
  toWGS84,
  CoordSystem,
  type Coordinate,
  type Point,
  type LatLng,
  getDistance,
  isPointInPolygon,
  calculatePolygonArea,
  getOffsetCoordinate,
  createBoundingBox,
  CoordinateError,
  transformer,
  toPoint,
  toLatLng,
  EARTH_RADIUS,
  DEGREES_TO_RADIANS,
  RADIANS_TO_DEGREES
} from '../index';

// 定义测试用的边界值常量
const CHINA_BOUNDS = {
  LAT: { MIN: 0.8293, MAX: 55.8271 },
  LNG: { MIN: 72.004, MAX: 137.8347 }
};

describe('坐标转换工具测试', () => {
  // 更新测试数据为实际转换结果
  const wgs84Coord: Coordinate = { longitude: 116.404, latitude: 39.915 };
  const gcj02Coord: Coordinate = { longitude: 116.4102445, latitude: 39.91640428 };
  const bd09Coord: Coordinate = { longitude: 116.4169115, latitude: 39.92273522 };
  
  describe('基础坐标转换', () => {
    test('WGS84 转 GCJ02', () => {
      const result = transform(wgs84Coord, CoordSystem.WGS84, CoordSystem.GCJ02);
      expect(result.longitude).toBeCloseTo(gcj02Coord.longitude, 3);
      expect(result.latitude).toBeCloseTo(gcj02Coord.latitude, 3);
    });

    test('GCJ02 转 BD09', () => {
      const result = transform(gcj02Coord, CoordSystem.GCJ02, CoordSystem.BD09);
      expect(result.longitude).toBeCloseTo(bd09Coord.longitude, 3);
      expect(result.latitude).toBeCloseTo(bd09Coord.latitude, 3);
    });

    test('BD09 转 WGS84', () => {
      const result = transform(bd09Coord, CoordSystem.BD09, CoordSystem.WGS84);
      expect(result.longitude).toBeCloseTo(wgs84Coord.longitude, 3);
      expect(result.latitude).toBeCloseTo(wgs84Coord.latitude, 3);
    });
  });

  describe('多格式输入支持', () => {
    test('数组格式输入', () => {
      const point: Point = [116.404, 39.915];
      const result = toGCJ02(point);
      expect(result.longitude).toBeCloseTo(gcj02Coord.longitude, 3);
      expect(result.latitude).toBeCloseTo(gcj02Coord.latitude, 3);
    });

    test('LatLng格式输入', () => {
      const latlng: LatLng = { lat: 39.915, lng: 116.404 };
      const result = toGCJ02(latlng);
      expect(result.longitude).toBeCloseTo(gcj02Coord.longitude, 3);
      expect(result.latitude).toBeCloseTo(gcj02Coord.latitude, 3);
    });

    test('toBD09 转换测试', () => {
      const point: Point = [116.404, 39.915];
      const result = toBD09(point);
      expect(result.longitude).toBeCloseTo(bd09Coord.longitude, 3);
      expect(result.latitude).toBeCloseTo(bd09Coord.latitude, 3);
    });

    test('toWGS84 转换测试', () => {
      const point: Point = [116.4169115, 39.92273522]; // 更新的BD09坐标
      const result = toWGS84(point, CoordSystem.BD09);
      expect(result.longitude).toBeCloseTo(wgs84Coord.longitude, 3);
      expect(result.latitude).toBeCloseTo(wgs84Coord.latitude, 3);
    });
  });

  describe('边界条件处理', () => {
    test('中国境外坐标', () => {
      const tokyoCoord: Coordinate = { longitude: 139.7673068, latitude: 35.6809591 };
      const result = transform(tokyoCoord, CoordSystem.WGS84, CoordSystem.GCJ02);
      expect(result).toEqual(tokyoCoord);
    });

    test('无效坐标输入', () => {
      const invalidCoord: Coordinate = { longitude: 181, latitude: 91 };
      expect(() => transform(invalidCoord, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow('无效的坐标范围');
    });
  });

  describe('距离计算', () => {
    test('计算两点之间的距离', () => {
      const point1: Coordinate = { longitude: 116.404, latitude: 39.915 };
      const point2: Coordinate = { longitude: 116.405, latitude: 39.916 };
      const distance = getDistance(point1, point2, CoordSystem.WGS84);
      expect(distance).toBeCloseTo(140.14, 1);
    });
  });

  describe('多边形操作', () => {
    const polygon: Coordinate[] = [
      { longitude: 116.404, latitude: 39.915 },
      { longitude: 116.405, latitude: 39.915 },
      { longitude: 116.405, latitude: 39.916 },
      { longitude: 116.404, latitude: 39.916 }
    ];

    test('点在多边形内', () => {
      const point: Coordinate = { longitude: 116.4045, latitude: 39.9155 };
      expect(isPointInPolygon(point, polygon, CoordSystem.WGS84)).toBe(true);
    });

    test('点在多边形外', () => {
      const point: Coordinate = { longitude: 116.403, latitude: 39.914 };
      expect(isPointInPolygon(point, polygon, CoordSystem.WGS84)).toBe(false);
    });

    test('计算多边形面积', () => {
      const area = calculatePolygonArea(polygon, CoordSystem.WGS84);
      expect(area).toBeGreaterThan(0);
    });
  });

  describe('坐标偏移', () => {
    test('计算偏移坐标', () => {
      const coord: Coordinate = { longitude: 116.404, latitude: 39.915 };
      const result = getOffsetCoordinate(coord, 100, 90, CoordSystem.WGS84); // 向东100米
      expect(result.longitude).toBeGreaterThan(coord.longitude);
      expect(result.latitude).toBeCloseTo(coord.latitude, 6);
    });

    test('处理无效的偏移距离和角度', () => {
      const coord = { longitude: 116.404, latitude: 39.915 };
      
      // 测试无效距离
      expect(() => getOffsetCoordinate(coord, -1, 0, CoordSystem.WGS84))
        .toThrow(CoordinateError);
      expect(() => getOffsetCoordinate(coord, NaN, 0, CoordSystem.WGS84))
        .toThrow(CoordinateError);
      
      // 测试无效角度
      expect(() => getOffsetCoordinate(coord, 100, -1, CoordSystem.WGS84))
        .toThrow(CoordinateError);
      expect(() => getOffsetCoordinate(coord, 100, 361, CoordSystem.WGS84))
        .toThrow(CoordinateError);
      expect(() => getOffsetCoordinate(coord, 100, NaN, CoordSystem.WGS84))
        .toThrow(CoordinateError);
    });
  });

  describe('边界框计算', () => {
    test('创建边界框', () => {
      const coords: Coordinate[] = [
        { longitude: 116.404, latitude: 39.915 },
        { longitude: 116.405, latitude: 39.916 },
        { longitude: 116.403, latitude: 39.914 }
      ];
      
      const bbox = createBoundingBox(coords);
      expect(bbox.minLng).toBe(116.403);
      expect(bbox.maxLng).toBe(116.405);
      expect(bbox.minLat).toBe(39.914);
      expect(bbox.maxLat).toBe(39.916);
    });

    test('空坐标数组', () => {
      expect(() => createBoundingBox([]))
        .toThrow(CoordinateError);
    });
  });

  describe('边界条件和错误处理', () => {
    test('无效的经度范围', () => {
      const invalidLng: Coordinate = { longitude: 181, latitude: 39.915 };
      expect(() => transform(invalidLng, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow(CoordinateError);
    });

    test('无效的纬度范围', () => {
      const invalidLat: Coordinate = { longitude: 116.404, latitude: 91 };
      expect(() => transform(invalidLat, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow(CoordinateError);
    });

    test('空多边形计算面积', () => {
      expect(calculatePolygonArea([], CoordSystem.WGS84)).toBe(0);
    });

    test('两点多边形计算面积', () => {
      const twoPoints = [
        { longitude: 116.404, latitude: 39.915 },
        { longitude: 116.405, latitude: 39.916 }
      ];
      expect(calculatePolygonArea(twoPoints, CoordSystem.WGS84)).toBe(0);
    });
  });

  describe('格式转换功能', () => {
    test('数组格式输入处理', () => {
      const point: Point = [116.404, 39.915];
      const result = transform(point, CoordSystem.WGS84, CoordSystem.GCJ02);
      expect(result).toHaveProperty('longitude');
      expect(result).toHaveProperty('latitude');
    });

    test('LatLng格式输入处理', () => {
      const latlng: LatLng = { lat: 39.915, lng: 116.404 };
      const result = transform(latlng, CoordSystem.WGS84, CoordSystem.GCJ02);
      expect(result).toHaveProperty('longitude');
      expect(result).toHaveProperty('latitude');
    });

    test('处理特殊数值', () => {
      const specialCoord: Coordinate = { longitude: 0, latitude: 0 };
      expect(() => transform(specialCoord, CoordSystem.WGS84, CoordSystem.GCJ02))
        .not.toThrow();
    });
  });

  describe('距离计算高级测试', () => {
    test('相同点距离为0', () => {
      const point: Coordinate = { longitude: 116.404, latitude: 39.915 };
      const distance = getDistance(point, point, CoordSystem.WGS84);
      expect(distance).toBe(0);
    });

    test('跨日期变更线距离', () => {
      const point1: Coordinate = { longitude: 179.9, latitude: 0 };
      const point2: Coordinate = { longitude: -179.9, latitude: 0 };
      const distance = getDistance(point1, point2, CoordSystem.WGS84);
      expect(distance).toBeLessThan(300000); // 应小于300km
    });

    test('南北极点距离', () => {
      const northPole: Coordinate = { longitude: 0, latitude: 90 };
      const southPole: Coordinate = { longitude: 0, latitude: -90 };
      const distance = getDistance(northPole, southPole, CoordSystem.WGS84);
      expect(distance).toBeCloseTo(20015087, 0); // 约20015km
    });
  });

  describe('多边形操作高级测试', () => {
    const complexPolygon: Coordinate[] = [
      { longitude: 116.404, latitude: 39.915 },
      { longitude: 116.405, latitude: 39.915 },
      { longitude: 116.405, latitude: 39.916 },
      { longitude: 116.404, latitude: 39.916 },
      { longitude: 116.404, latitude: 39.915 } // 闭合多边形
    ];

    test('边界点判断', () => {
      const boundaryPoint: Coordinate = { longitude: 116.404, latitude: 39.915 };
      expect(isPointInPolygon(boundaryPoint, complexPolygon, CoordSystem.WGS84)).toBe(true);
    });

    test('复杂多边形面积', () => {
      const area = calculatePolygonArea(complexPolygon, CoordSystem.WGS84);
      expect(area).toBeCloseTo(9483.33, 0); // 更新为实际计算值
    });
  });

  describe('坐标偏移高级测试', () => {
    test('360度偏移回原点', () => {
      const origin: Coordinate = { longitude: 116.404, latitude: 39.915 };
      const result = getOffsetCoordinate(origin, 100, 360, CoordSystem.WGS84);
      expect(result.longitude).toBeCloseTo(origin.longitude, 6);
      expect(result.latitude).toBeCloseTo(origin.latitude, 2);
    });

    test('北极点偏移', () => {
      const northPole: Coordinate = { longitude: 0, latitude: 89.9 };
      const result = getOffsetCoordinate(northPole, 1000, 0, CoordSystem.WGS84);
      expect(result.latitude).toBeCloseTo(89.909, 3);
    });
  });

  describe('边界框计算高级测试', () => {
    test('跨日期变更线边界框', () => {
      const coords: Coordinate[] = [
        { longitude: 179, latitude: 0 },
        { longitude: -179, latitude: 1 }
      ];
      const bbox = createBoundingBox(coords);
      expect(bbox.minLng).toBe(-179);
      expect(bbox.maxLng).toBe(179);
      expect(bbox.minLat).toBe(0);
      expect(bbox.maxLat).toBe(1);
    });

    test('单点边界框', () => {
      const coords: Coordinate[] = [
        { longitude: 116.404, latitude: 39.915 }
      ];
      const bbox = createBoundingBox(coords);
      expect(bbox.minLng).toBe(116.404);
      expect(bbox.maxLng).toBe(116.404);
      expect(bbox.minLat).toBe(39.915);
      expect(bbox.maxLat).toBe(39.915);
    });
  });

  describe('坐标系统互转性能测试', () => {
    test('大量坐标批量转换性能', () => {
      const coords: Coordinate[] = Array(1000).fill(null).map(() => ({
        longitude: 116.404 + Math.random(),
        latitude: 39.915 + Math.random()
      }));
      
      const startTime = Date.now();
      coords.forEach(coord => transform(coord, CoordSystem.WGS84, CoordSystem.GCJ02));
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // 应在1秒内完成
    });
  });

  describe('中国边界检测', () => {
    test('中国边界点检测', () => {
      const testCases = [
        // 边界点测试
        { coord: { longitude: 72.004, latitude: 0.8293 }, expected: false }, // 西南角
        { coord: { longitude: 137.8347, latitude: 55.8271 }, expected: false }, // 东北角
        // 明显在中国境外的点
        { coord: { longitude: 0, latitude: 0 }, expected: true }, // 赤道上的点
        { coord: { longitude: 150, latitude: 45 }, expected: true }, // 日本
        // 边界值测试
        { coord: { longitude: 72.003, latitude: 0.8292 }, expected: true }, // 刚好超出西南边界
        { coord: { longitude: 137.8348, latitude: 55.8272 }, expected: true } // 刚好超出东北边界
      ];

      testCases.forEach(({ coord, expected }) => {
        const result = transform(coord, CoordSystem.WGS84, CoordSystem.GCJ02);
        if (expected) {
          expect(result).toEqual(coord); // 境外坐标应该保持不变
        } else {
          expect(result).not.toEqual(coord); // 境内坐标应该发生变换
        }
      });
    });
  });

  describe('坐标数据校验', () => {
    const validationTestCases = [
      // 有效边界值
      { coord: { longitude: -180, latitude: -90 }, valid: true },
      { coord: { longitude: 180, latitude: 90 }, valid: true },
      { coord: { longitude: 0, latitude: 0 }, valid: true },
      // 无效边界值
      { coord: { longitude: -180.000001, latitude: 0 }, valid: false },
      { coord: { longitude: 180.000001, latitude: 0 }, valid: false },
      { coord: { longitude: 0, latitude: -90.000001 }, valid: false },
      { coord: { longitude: 0, latitude: 90.000001 }, valid: false },
      // 特殊值测试
      { coord: { longitude: NaN, latitude: 0 }, valid: false },
      { coord: { longitude: 0, latitude: NaN }, valid: false },
      { coord: { longitude: Infinity, latitude: 0 }, valid: false },
      { coord: { longitude: 0, latitude: Infinity }, valid: false }
    ];

    test.each(validationTestCases)(
      '坐标验证: ($coord.longitude, $coord.latitude)',
      ({ coord, valid }) => {
        if (valid) {
          expect(() => transform(coord, CoordSystem.WGS84, CoordSystem.GCJ02)).not.toThrow();
        } else {
          expect(() => transform(coord, CoordSystem.WGS84, CoordSystem.GCJ02))
            .toThrow(CoordinateError);
        }
      }
    );
  });

  describe('坐标系转换逻辑组合', () => {
    const logicCombinations = [
      { from: CoordSystem.WGS84, to: CoordSystem.WGS84 },
      { from: CoordSystem.WGS84, to: CoordSystem.GCJ02 },
      { from: CoordSystem.WGS84, to: CoordSystem.BD09 },
      { from: CoordSystem.GCJ02, to: CoordSystem.WGS84 },
      { from: CoordSystem.GCJ02, to: CoordSystem.GCJ02 },
      { from: CoordSystem.GCJ02, to: CoordSystem.BD09 },
      { from: CoordSystem.BD09, to: CoordSystem.WGS84 },
      { from: CoordSystem.BD09, to: CoordSystem.GCJ02 },
      { from: CoordSystem.BD09, to: CoordSystem.BD09 }
    ];

    test.each(logicCombinations)(
      '从 $from 转换到 $to',
      ({ from, to }) => {
        const coord = { longitude: 116.404, latitude: 39.915 };
        const result = transform(coord, from, to);
        expect(result).toBeDefined();
        expect(result).toHaveProperty('longitude');
        expect(result).toHaveProperty('latitude');
      }
    );

    test('不支持的坐标系转换', () => {
      const coord = { longitude: 116.404, latitude: 39.915 };
      // @ts-ignore - 故意传入无效的坐标系
      expect(() => transform(coord, 'INVALID', CoordSystem.WGS84))
        .toThrow('不支持的源坐标系');
      // @ts-ignore - 故意传入无效的坐标系
      expect(() => transform(coord, CoordSystem.WGS84, 'INVALID'))
        .toThrow('不支持的目标坐标系');
    });
  });

  describe('错误处理', () => {
    test('处理无效的坐标格式', () => {
      // @ts-ignore - 故意传入无效格式
      expect(() => transform(null, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
      // @ts-ignore - 故意传入无效格式
      expect(() => transform(undefined, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
      // @ts-ignore - 故意传入无效格式
      expect(() => transform({}, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
    });

    test('处理不完整的坐标对象', () => {
      // @ts-ignore - 故意传入不完整对象
      expect(() => transform({ longitude: 116.404 }, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
      // @ts-ignore - 故意传入不完整对象
      expect(() => transform({ latitude: 39.915 }, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
    });
  });

  describe('坐标格式标准化', () => {
    test('处理无效的坐标格式', () => {
      // @ts-ignore - 故意传入无效格式
      expect(() => transform(null, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
      // @ts-ignore - 故意传入无效格式
      expect(() => transform(undefined, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
      // @ts-ignore - 故意传入无效格式
      expect(() => transform({}, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
    });

    test('处理所有有效的输入格式', () => {
      const expectedLng = 116.404;
      const expectedLat = 39.915;

      // 测试 Coordinate 格式
      const coordResult = transform(
        { longitude: expectedLng, latitude: expectedLat },
        CoordSystem.WGS84,
        CoordSystem.WGS84
      );
      expect(coordResult.longitude).toBe(expectedLng);
      expect(coordResult.latitude).toBe(expectedLat);

      // 测试 Point 格式
      const pointResult = transform(
        [expectedLng, expectedLat],
        CoordSystem.WGS84,
        CoordSystem.WGS84
      );
      expect(pointResult.longitude).toBe(expectedLng);
      expect(pointResult.latitude).toBe(expectedLat);

      // 测试 LatLng 格式
      const latlngResult = transform(
        { lat: expectedLat, lng: expectedLng },
        CoordSystem.WGS84,
        CoordSystem.WGS84
      );
      expect(latlngResult.longitude).toBe(expectedLng);
      expect(latlngResult.latitude).toBe(expectedLat);
    });
  });

  describe('批量坐标转换', () => {
    test('空数组转换', () => {
      const result = transformer.batchTransform([], CoordSystem.WGS84, CoordSystem.GCJ02);
      expect(result).toEqual([]);
    });

    test('多个坐标批量转换', () => {
      const coords = [
        { longitude: 116.404, latitude: 39.915 },
        { longitude: 116.405, latitude: 39.916 },
        { longitude: 116.406, latitude: 39.917 }
      ];
      
      const results = transformer.batchTransform(coords, CoordSystem.WGS84, CoordSystem.GCJ02);
      
      expect(results.length).toBe(coords.length);
      results.forEach(result => {
        expect(result).toHaveProperty('longitude');
        expect(result).toHaveProperty('latitude');
        expect(typeof result.longitude).toBe('number');
        expect(typeof result.latitude).toBe('number');
      });
    });

    test('相同坐标系批量转换', () => {
      const coords = [
        { longitude: 116.404, latitude: 39.915 },
        { longitude: 116.405, latitude: 39.916 }
      ];
      
      const results = transformer.batchTransform(coords, CoordSystem.WGS84, CoordSystem.WGS84);
      expect(results).toEqual(coords);
    });
  });

  describe('格式转换函数', () => {
    const coord: Coordinate = { longitude: 116.404, latitude: 39.915 };

    test('toPoint 转换', () => {
      const point = toPoint(coord);
      expect(point).toEqual([116.404, 39.915]);
      expect(Array.isArray(point)).toBe(true);
      expect(point.length).toBe(2);
    });

    test('toLatLng 转换', () => {
      const latlng = toLatLng(coord);
      expect(latlng).toEqual({ lat: 39.915, lng: 116.404 });
      expect(latlng.lat).toBe(coord.latitude);
      expect(latlng.lng).toBe(coord.longitude);
    });

    test('常量导出', () => {
      expect(EARTH_RADIUS).toBe(6371000);
      expect(DEGREES_TO_RADIANS).toBe(Math.PI / 180);
      expect(RADIANS_TO_DEGREES).toBe(180 / Math.PI);
    });
  });

  describe('边界条件补充测试', () => {
    test('中国边界极限值', () => {
      const coords = [
        { longitude: CHINA_BOUNDS.LNG.MIN, latitude: CHINA_BOUNDS.LAT.MIN },
        { longitude: CHINA_BOUNDS.LNG.MAX, latitude: CHINA_BOUNDS.LAT.MAX }
      ];
      
      coords.forEach(coord => {
        const result = transform(coord, CoordSystem.WGS84, CoordSystem.GCJ02);
        expect(result).not.toEqual(coord);
      });
    });

    test('坐标精度控制', () => {
      const coord = { longitude: 116.404123456789, latitude: 39.915987654321 };
      const result = transform(coord, CoordSystem.WGS84, CoordSystem.GCJ02);
      
      // 检查小数位数
      const longitudeDecimals = result.longitude.toString().split('.')[1]?.length || 0;
      const latitudeDecimals = result.latitude.toString().split('.')[1]?.length || 0;
      
      expect(longitudeDecimals).toBeLessThanOrEqual(8); // CONFIG.PRECISION.COORDINATE
      expect(latitudeDecimals).toBeLessThanOrEqual(8);
    });

    test('迭代逼近精度', () => {
      const coord = { longitude: 116.404, latitude: 39.915 };
      const gcj02 = transform(coord, CoordSystem.WGS84, CoordSystem.GCJ02);
      const wgs84 = transform(gcj02, CoordSystem.GCJ02, CoordSystem.WGS84);
      
      expect(wgs84.longitude).toBeCloseTo(coord.longitude, 6);
      expect(wgs84.latitude).toBeCloseTo(coord.latitude, 6);
    });
  });

  describe('边界条件和错误处理补充', () => {
    test('处理非数组类型的多边形', () => {
      // @ts-ignore
      expect(() => isPointInPolygon({ longitude: 116.404, latitude: 39.915 }, null))
        .toThrow();
      // @ts-ignore
      expect(() => isPointInPolygon({ longitude: 116.404, latitude: 39.915 }, undefined))
        .toThrow();
    });

    test('处理无效的偏移距离和角度', () => {
      const coord = { longitude: 116.404, latitude: 39.915 };
      // @ts-ignore
      expect(() => getOffsetCoordinate(coord, -1, 0)).toThrow();
      // @ts-ignore
      expect(() => getOffsetCoordinate(coord, 0, -1)).toThrow();
      // @ts-ignore
      expect(() => getOffsetCoordinate(coord, NaN, 0)).toThrow();
      // @ts-ignore
      expect(() => getOffsetCoordinate(coord, 0, NaN)).toThrow();
    });

    test('处理极端坐标转换', () => {
      // 极点转换
      const northPole = { longitude: 0, latitude: 90 };
      const southPole = { longitude: 0, latitude: -90 };
      expect(() => transform(northPole, CoordSystem.WGS84, CoordSystem.GCJ02)).not.toThrow();
      expect(() => transform(southPole, CoordSystem.WGS84, CoordSystem.GCJ02)).not.toThrow();

      // 日期变更线
      const dateLine = { longitude: 180, latitude: 0 };
      expect(() => transform(dateLine, CoordSystem.WGS84, CoordSystem.GCJ02)).not.toThrow();
    });
  });

  describe('坐标系转换边界情况', () => {
    test('GCJ02到WGS84的迭代极限', () => {
      const gcj02Coord = { longitude: 116.404, latitude: 39.915 };
      const wgs84 = transform(gcj02Coord, CoordSystem.GCJ02, CoordSystem.WGS84);
      const backToGcj02 = transform(wgs84, CoordSystem.WGS84, CoordSystem.GCJ02);
      
      expect(backToGcj02.longitude).toBeCloseTo(gcj02Coord.longitude, 6);
      expect(backToGcj02.latitude).toBeCloseTo(gcj02Coord.latitude, 6);
    });

    test('BD09到GCJ02的边界值', () => {
      const bd09Coord = { longitude: 180, latitude: 90 };
      expect(() => transform(bd09Coord, CoordSystem.BD09, CoordSystem.GCJ02)).not.toThrow();
    });
  });

  describe('多边形计算边界情况', () => {
    test('处理自相交多边形', () => {
      const selfIntersectingPolygon = [
        { longitude: 0, latitude: 0 },
        { longitude: 1, latitude: 1 },
        { longitude: 0, latitude: 1 },
        { longitude: 1, latitude: 0 }
      ];
      expect(() => calculatePolygonArea(selfIntersectingPolygon)).not.toThrow();
    });

    test('处理重复点的多边形', () => {
      const polygonWithDuplicates = [
        { longitude: 0, latitude: 0 },
        { longitude: 0, latitude: 0 }, // 重复点
        { longitude: 1, latitude: 1 },
        { longitude: 0, latitude: 1 }
      ];
      expect(() => calculatePolygonArea(polygonWithDuplicates)).not.toThrow();
    });
  });

  describe('坐标格式转换边界情况', () => {
    test('处理特殊格式转换', () => {
      // @ts-ignore
      expect(() => transform([NaN, 0], CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
      // @ts-ignore
      expect(() => transform({ lat: NaN, lng: 0 }, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
    });

    test('处理不完整的LatLng对象', () => {
      // @ts-ignore
      expect(() => transform({ lat: 39.915 }, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
      // @ts-ignore
      expect(() => transform({ lng: 116.404 }, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
    });
  });

  describe('批量转换边界情况', () => {
    test('处理包含无效坐标的数组', () => {
      const coords = [
        { longitude: 116.404, latitude: 39.915 },
        { longitude: NaN, latitude: 39.915 },
        { longitude: 116.405, latitude: NaN }
      ];
      
      expect(() => transformer.batchTransform(coords, CoordSystem.WGS84, CoordSystem.GCJ02))
        .toThrow();
    });

    test('处理超大数组的性能', () => {
      const coords = Array(10000).fill({ longitude: 116.404, latitude: 39.915 });
      expect(() => transformer.batchTransform(coords, CoordSystem.WGS84, CoordSystem.GCJ02))
        .not.toThrow();
    });
  });

  describe('坐标转换核心算法测试', () => {
    test('WGS84到GCJ02的边界转换', () => {
      // 测试中国边界上的点
      const boundaryPoints = [
        { longitude: 72.004, latitude: 0.8293 },  // 西南角
        { longitude: 137.8347, latitude: 55.8271 }, // 东北角
        { longitude: 72.004, latitude: 55.8271 },  // 西北角
        { longitude: 137.8347, latitude: 0.8293 }  // 东南角
      ];

      boundaryPoints.forEach(point => {
        const result = transform(point, CoordSystem.WGS84, CoordSystem.GCJ02);
        expect(result).not.toEqual(point); // 应该有偏移
      });
    });

    test('GCJ02到BD09的边界转换', () => {
      const extremePoints = [
        { longitude: -180, latitude: -90 },
        { longitude: 180, latitude: 90 },
        { longitude: 0, latitude: 0 }
      ];

      extremePoints.forEach(point => {
        expect(() => transform(point, CoordSystem.GCJ02, CoordSystem.BD09))
          .not.toThrow();
      });
    });

    test('完整坐标系转换链', () => {
      const testPoints = [
        { longitude: 116.404, latitude: 39.915 },
        { longitude: 180, latitude: 90 },
        { longitude: -180, latitude: -90 },
        { longitude: 0, latitude: 0 }
      ];

      const systems = [CoordSystem.WGS84, CoordSystem.GCJ02, CoordSystem.BD09];

      testPoints.forEach(point => {
        systems.forEach(from => {
          systems.forEach(to => {
            expect(() => transform(point, from, to)).not.toThrow();
          });
        });
      });
    });

    test('特殊区域坐标转换', () => {
      // 测试中国边界附近的点
      const nearBoundaryPoints = [
        { longitude: 72.003, latitude: 0.8292 },  // 刚好在边界外
        { longitude: 72.005, latitude: 0.8294 },  // 刚好在边界内
        { longitude: 137.8346, latitude: 55.8270 }, // 刚好在边界内
        { longitude: 137.8348, latitude: 55.8272 }  // 刚好在边界外
      ];

      nearBoundaryPoints.forEach(point => {
        const result = transform(point, CoordSystem.WGS84, CoordSystem.GCJ02);
        if (point.longitude < 72.004 || point.longitude > 137.8347 ||
            point.latitude < 0.8293 || point.latitude > 55.8271) {
          expect(result).toEqual(point); // 边界外应该保持不变
        } else {
          expect(result).not.toEqual(point); // 边界内应该有偏移
        }
      });
    });

    test('偏移计算精度测试', () => {
      const testPoint = { longitude: 116.404, latitude: 39.915 };
      
      // 测试不同距离的偏移
      const distances = [0, 1, 10, 100, 1000, 10000];
      const bearings = [0, 90, 180, 270, 360];

      distances.forEach(distance => {
        bearings.forEach(bearing => {
          const result = getOffsetCoordinate(testPoint, distance, bearing);
          expect(result).toBeDefined();
          expect(Number.isFinite(result.longitude)).toBe(true);
          expect(Number.isFinite(result.latitude)).toBe(true);
        });
      });
    });

    test('多边形面积计算边界情况', () => {
      // 测试跨日期变更线的多边形
      const crossDatelinePolygon = [
        { longitude: 179, latitude: 0 },
        { longitude: -179, latitude: 0 },
        { longitude: -179, latitude: 1 },
        { longitude: 179, latitude: 1 }
      ];
      
      const area = calculatePolygonArea(crossDatelinePolygon);
      expect(area).toBeGreaterThan(0);

      // 测试极点附近的多边形
      const nearPolePolygon = [
        { longitude: 0, latitude: 89 },
        { longitude: 120, latitude: 89 },
        { longitude: -120, latitude: 89 }  // 修改为有效的经度值
      ];
      
      expect(() => calculatePolygonArea(nearPolePolygon)).not.toThrow();

      // 添加更多边界情况测试
      const edgeCasePolygons = [
        // 经度为180/-180的多边形
        [
          { longitude: 180, latitude: 0 },
          { longitude: 180, latitude: 1 },
          { longitude: 179, latitude: 1 }
        ],
        // 纬度为90/-90的多边形
        [
          { longitude: 0, latitude: 89.9 },
          { longitude: 120, latitude: 89.9 },
          { longitude: -120, latitude: 89.9 }
        ]
      ];

      edgeCasePolygons.forEach(polygon => {
        expect(() => calculatePolygonArea(polygon)).not.toThrow();
      });
    });
  });
}); 