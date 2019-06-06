"use strict";

let MaxRectsPacker = require("../dist/maxrects-packer").MaxRectsPacker;

const opt = {
    smart: true,
    pot: false,
    square: false,
    allowRotation: false,
    tag: false
}

let packer;
beforeEach(() => {
    packer = new MaxRectsPacker(1024, 1024, 0, opt);
});

describe("#add", () => {
    test("adds first element correctly", () => {
        packer.add(1000, 1000, {number: 1});
        expect(packer.bins[0].rects[0].data.number).toBe(1);
    });

    test("creates additional bin if element doesn't fit in existing bin", () => {
        packer.add(1000, 1000, {number: 1});
        packer.add(1000, 1000, {number: 2});
        expect(packer.bins.length).toBe(2);
        expect(packer.bins[1].rects[0].data.number).toBe(2);
    });

    test("adds to existing bins if possible", () => {
        packer.add(1000, 1000, {number: 1});
        packer.add(1000, 1000, {number: 2});
        packer.add(10, 10, {number: 3});
        packer.add(10, 10, {number: 4});
        expect(packer.bins.length).toBe(2);
    });

    test("adds to new bins after next() is called", () => {
        packer.add(1000, 1000, {number: 1});
        packer.add(1000, 1000, {number: 2});
        packer.next();
        packer.add(10, 10, {number: 3});
        packer.add(10, 10, {number: 4});
        expect(packer.bins.length).toBe(3);
        expect(packer.bins[packer.bins.length - 1].rects.length).toBe(2);
    });

    test("adds to bins with tag matching on", () => {
        packer.options.tag = true;
        packer.add(1000, 1000, {number: 1});
        packer.add(10, 10, {number: 2});
        packer.add(1000, 1000, {number: 3, tag: "one"});
        packer.add(1000, 1000, {number: 4, tag: "one"});
        packer.add(10, 10, {number: 5, tag: "one"});
        packer.add(10, 10, {number: 6, tag: "one"});
        packer.add(10, 10, {number: 7, tag: "two"});
        packer.next();
        packer.add(10, 10, {number: 8, tag: "two"});
        expect(packer.bins.length).toBe(5);
        expect(packer.bins[0].rects.length).toBe(2);
        expect(packer.bins[0].tag).toBeUndefined();
        expect(packer.bins[1].rects.length).toBe(3);
        expect(packer.bins[1].tag).toBe("one");
        expect(packer.bins[2].rects.length).toBe(1);
        expect(packer.bins[2].tag).toBe("one");
        expect(packer.bins[packer.bins.length - 1].rects.length).toBe(1);
        expect(packer.bins[packer.bins.length - 1].tag).toBe("two");
    });

    test("adds to bins with tag matching disable", () => {
        packer.options.tag = false;
        packer.add(1000, 1000, {number: 1});
        packer.add(10, 10, {number: 2});
        packer.add(1000, 1000, {number: 3, tag: "one"});
        packer.add(10, 10, {number: 4, tag: "two"});
        packer.next();
        packer.add(10, 10, {number: 8, tag: "two"});
        expect(packer.bins.length).toBe(3);
        expect(packer.bins[0].tag).toBeUndefined();
        expect(packer.bins[1].tag).toBeUndefined();
        expect(packer.bins[packer.bins.length - 1].rects.length).toBe(1);
        expect(packer.bins[packer.bins.length - 1].tag).toBeUndefined();
    });

    test("allows oversized elements to be added", () => {
        packer.add(1000, 1000, {number: 1});
        packer.add(2000, 2000, {number: 2});
        expect(packer.bins.length).toBe(2);
        expect(packer.bins[1].rects[0].width).toBe(2000);
        expect(packer.bins[1].rects[0].oversized).toBe(true);
    });
});

describe("#sort", () => {
    test("does not mutate input array", () => {
        let input = [
            {width: 1, height: 1},
            {width: 2, height: 2}
        ];
        packer.sort(input);
        expect(input[0].width).toBe(1);
    });

    test("works correctly", () => {
        let input = [
            {width: 1, height: 1},
            {width: 3, height: 1},
            {width: 2, height: 2}
        ];
        let output = packer.sort(input);
        expect(output[0].width).toBe(3);
        expect(output[1].width).toBe(2);
        expect(output[2].width).toBe(1);
    });
});

describe("#addArray", () => {
    test("adds multiple elements to bins", () => {
        let input = [
            {width: 1000, height: 1000, data: {number: 1}},
            {width: 1000, height: 1000, data: {number: 2}}
        ];
        packer.addArray(input);
        expect(packer.bins.length).toBe(2);
    });

    test("adds the big rects first", () => {
        let input = [
            {width: 600, height: 20, data: {number: 1}},
            {width: 600, height: 20, data: {number: 2}},
            {width: 1000, height: 1000, data: {number: 3}},
            {width: 1000, height: 1000, data: {number: 4}}
        ];
        packer.addArray(input);
        expect(packer.bins.length).toBe(2);
    });

    test("adds the big rects & big hash first", () => {
        let input = [
            {width: 600, height: 20, data: {number: 1}, hash: "aaa"},
            {width: 600, height: 20, data: {number: 2}, hash: "bbb"},
            {width: 1000, height: 1000, data: {number: 3}, hash: "ccc"},
            {width: 1000, height: 1000, data: {number: 4}, hash: "ddd"}
        ];
        packer.addArray(input);
        expect(packer.bins.length).toBe(2);
        expect(packer.bins[0].rects[0].hash).toBe("ddd");
        expect(packer.bins[0].rects[1].hash).toBe("bbb");
    });
});

describe("#save & load", () => {
    test("Load old bins and continue packing", () => {
        let input = [
            {width: 512, height: 512, data: {number: 1}},
            {width: 512, height: 512, data: {number: 2}},
            {width: 512, height: 512, data: {number: 3}},
            {width: 512, height: 512, data: {number: 4}},
        ];
        packer.add(input[0].width, input[0].height, input[0].data);
        expect(packer.bins.length).toBe(1);
        let bins = packer.save();
        expect(bins[0].freeRects.length).toBe(0);
        packer.load(bins);
        packer.addArray(input);
        expect(packer.bins.length).toBe(2);
    });
});

test("passes padding through", () => {
    packer = new MaxRectsPacker(1024, 1024, 4, opt);
    packer.add(500, 500, {number: 1});
    packer.add(500, 500, {number: 1});
    packer.add(500, 500, {number: 1});
    expect(packer.bins[0].width).toBe(1004);
});