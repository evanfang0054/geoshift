# GeoShift

转换中国地区不同坐标系统的工具库，支持 WGS84(GPS)、GCJ02(高德)和 BD09(百度) 坐标系统之间的互相转换

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.0-blue.svg)](https://www.typescriptlang.org/)

## 特性

- 🚀 支持主流坐标系统互转（WGS84、GCJ02、BD09）
- 💪 TypeScript 编写，提供完整类型定义
- 🎯 高精度转换算法，采用迭代逼近法
- 📦 支持 ESM 和 CommonJS 两种模块规范
- 🔒 内置坐标验证，异常处理
- 🪶 零依赖，轻量级实现
- 🧩 支持多种坐标输入/输出格式

## 安装

```bash
npm install geoshift -S
```

## 使用方法

### 基础用法

```typescript
import {
  baiduToGCJ02,
  gpsToGCJ02,
  CoordinateSystem,
  convert,
} from 'geoshift';

// 使用单一转换方法
const gcj02Point = baiduToGCJ02(116.404, 39.915);
console.log('百度坐标转高德坐标:', gcj02Point);

// 使用通用转换方法
const point = [116.404, 39.915];
const wgs84Point = convert(
  point,
  CoordinateSystem.BD09,
  CoordinateSystem.WGS84,
);
console.log('百度坐标转GPS坐标:', wgs84Point);
```

### 支持的转换方法

```typescript
// 百度坐标 (BD09) 转 高德坐标 (GCJ02)
baiduToGCJ02(longitude: number, latitude: number): [number, number]

// 高德坐标 (GCJ02) 转 百度坐标 (BD09)
GCJ02ToBaidu(longitude: number, latitude: number): [number, number]

// GPS坐标 (WGS84) 转 高德坐标 (GCJ02)
gpsToGCJ02(longitude: number, latitude: number): [number, number]

// 高德坐标 (GCJ02) 转 GPS坐标 (WGS84)
GCJ02ToGps(longitude: number, latitude: number): [number, number]

// 百度坐标 (BD09) 转 GPS坐标 (WGS84)
baiduToGps(longitude: number, latitude: number): [number, number]

// GPS坐标 (WGS84) 转 百度坐标 (BD09)
gpsToBaidu(longitude: number, latitude: number): [number, number]

// 通用转换方法
convert(point: [number, number], from: CoordinateSystem, to: CoordinateSystem): [number, number]
```

### 坐标系统枚举

```typescript
enum CoordinateSystem {
  WGS84 = 'WGS84', // GPS坐标系
  GCJ02 = 'GCJ02', // 高德坐标系
  BD09 = 'BD09', // 百度坐标系
}
```

## 注意事项

1. 坐标转换仅适用于中国大陆地区，海外地区的坐标转换会直接返回原坐标。

2. 坐标系统说明：

   - WGS84：GPS 全球定位系统使用的标准坐标系
   - GCJ02：中国国测局制定的加密坐标系，高德、腾讯等地图使用
   - BD09：百度地图使用的坐标系，在 GCJ02 基础上再次加密

3. 转换精度：
   - 保留小数点后 6 位
   - 由于加密算法的特性，坐标转换存在一定的误差

## 错误处理

该库会对无效的坐标输入进行验证，并抛出相应的错误：

```typescript
try {
  const result = baiduToGCJ02(181, 91);
} catch (error) {
  console.error(error.message); // 坐标超出有效范围: 经度应在[-180, 180]之间，纬度应在[-90, 90]之间
}
```

## 高级功能

除了基本的坐标转换功能外，GeoShift 还提供了一系列实用的地理计算功能，帮助开发者更便捷地处理地理空间数据：

### 距离计算

```typescript
import { getDistance, CoordSystem } from 'geoshift';

// 计算两点之间的距离（米）
const point1 = { longitude: 116.404, latitude: 39.915 };
const point2 = { longitude: 116.410, latitude: 39.920 };

// 默认使用 WGS84 坐标系
const distance = getDistance(point1, point2);

// 指定坐标系
const distanceInGCJ02 = getDistance(point1, point2, CoordSystem.GCJ02);
```

### 点与多边形关系

```typescript
import { isPointInPolygon, CoordSystem } from 'geoshift';

const point = { longitude: 116.404, latitude: 39.915 };
const polygon = [
  { longitude: 116.400, latitude: 39.910 },
  { longitude: 116.410, latitude: 39.910 },
  { longitude: 116.410, latitude: 39.920 },
  { longitude: 116.400, latitude: 39.920 }
];

// 判断点是否在多边形内
const isInside = isPointInPolygon(point, polygon);
```

### 面积计算

```typescript
import { calculatePolygonArea, CoordSystem } from 'geoshift';

const polygon = [
  { longitude: 116.400, latitude: 39.910 },
  { longitude: 116.410, latitude: 39.910 },
  { longitude: 116.410, latitude: 39.920 },
  { longitude: 116.400, latitude: 39.920 }
];

// 计算多边形面积（平方米）
const area = calculatePolygonArea(polygon);
```

### 偏移计算

```typescript
import { getOffsetCoordinate, CoordSystem } from 'geoshift';

const point = { longitude: 116.404, latitude: 39.915 };

// 计算从给定点出发，沿指定方向和距离的新坐标
// 参数：坐标点、距离(米)、方向角度(0-360，正北为0，顺时针)
const newPoint = getOffsetCoordinate(point, 1000, 90); // 向东1公里
```

### 边界框计算

```typescript
import { createBoundingBox } from 'geoshift';

const points = [
  { longitude: 116.400, latitude: 39.910 },
  { longitude: 116.410, latitude: 39.920 },
  { longitude: 116.420, latitude: 39.915 }
];

// 计算一组点的边界框
const bbox = createBoundingBox(points);
// 结果: { minLat: 39.91, maxLat: 39.92, minLng: 116.4, maxLng: 116.42 }
```

### 批量坐标转换

```typescript
import { transformer, CoordSystem } from 'geoshift';

// 批量转换多个坐标点
const coordinates = [
  { longitude: 116.404, latitude: 39.915 },
  { longitude: 116.405, latitude: 39.916 },
  { longitude: 116.406, latitude: 39.917 }
];

// 批量从WGS84转换到GCJ02
const gcj02Coords = transformer.batchTransform(
  coordinates, 
  CoordSystem.WGS84, 
  CoordSystem.GCJ02
);
```

### 格式转换

```typescript
import { toPoint, toLatLng } from 'geoshift';

const coord = { longitude: 116.404, latitude: 39.915 };

// 转换为坐标点数组 [经度, 纬度]
const point = toPoint(coord); // [116.404, 39.915]

// 转换为LatLng格式 {lat, lng}
const latlng = toLatLng(coord); // {lat: 39.915, lng: 116.404}
```

## 浏览器兼容性

该库支持所有现代浏览器，包括：

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 16+

对于需要支持旧版浏览器的场景，建议使用 Babel 进行转译。

## 常见问题

### 为什么需要进行坐标转换？

由于国家安全考虑，中国大陆地区的地图使用经过加密的坐标系统（GCJ02、BD09），与国际标准的WGS84坐标系存在偏移。在开发涉及地图的应用时，需要进行坐标转换以确保位置准确性。

### 坐标转换的精度如何？

GeoShift 采用迭代逼近法进行坐标转换，精度可达厘米级别。在实际应用中，转换误差通常在1-2米以内，满足绝大多数应用场景需求。

### 如何处理大量坐标点的转换？

对于大量坐标点的转换，建议使用 `batchTransform` 方法，它比循环调用单点转换方法更高效。
