import { EDGE_MAX_VALUE } from "./maxrects-packer";
import { Rectangle } from "./geom/Rectangle";
import { Bin } from "./abstract-bin";
export class MaxRectsBin extends Bin {
    constructor(maxWidth = EDGE_MAX_VALUE, maxHeight = EDGE_MAX_VALUE, padding = 0, options = { smart: true, pot: true, square: true, allowRotation: false, tag: false }) {
        super();
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this.padding = padding;
        this.options = options;
        this.freeRects = [];
        this.rects = [];
        this.verticalExpand = false;
        this.width = this.options.smart ? 0 : maxWidth;
        this.height = this.options.smart ? 0 : maxHeight;
        this.freeRects.push(new Rectangle(this.maxWidth + this.padding, this.maxHeight + this.padding));
        this.stage = new Rectangle(this.width, this.height);
    }
    add(...args) {
        let width;
        let height;
        let data;
        let rect;
        if (args.length === 1) {
            if (typeof args[0] !== 'object')
                throw new Error("MacrectsBin.add(): Wrong parameters");
            rect = args[0];
            width = rect.width;
            height = rect.height;
            // Check if rect.tag match bin.tag, if bin.tag not defined, it will accept any rect
            if (this.options.tag && this.tag !== rect.tag)
                return undefined;
        }
        else {
            width = args[0];
            height = args[1];
            data = args.length > 2 ? args[2] : null;
            // Check if data.tag match bin.tag, if bin.tag not defined, it will accept any rect
            if (this.options.tag) {
                if (data && this.tag !== data.tag)
                    return undefined;
                if (!data && this.tag)
                    return undefined;
            }
        }
        let node = this.findNode(width + this.padding, height + this.padding);
        if (node) {
            this.updateBinSize(node);
            let numRectToProcess = this.freeRects.length;
            let i = 0;
            while (i < numRectToProcess) {
                if (this.splitNode(this.freeRects[i], node)) {
                    this.freeRects.splice(i, 1);
                    numRectToProcess--;
                    i--;
                }
                i++;
            }
            this.pruneFreeList();
            this.verticalExpand = this.width > this.height ? true : false;
            if (!rect) {
                rect = new Rectangle(width, height, node.x, node.y, node.rot);
                rect.data = data;
            }
            else {
                rect.x = node.x;
                rect.y = node.y;
                rect.rot = node.rot;
            }
            this.rects.push(rect);
            return rect;
        }
        else if (!this.verticalExpand) {
            if (this.updateBinSize(new Rectangle(width + this.padding, height + this.padding, this.width + this.padding, 0))
                || this.updateBinSize(new Rectangle(width + this.padding, height + this.padding, 0, this.height + this.padding))) {
                return rect ? this.add(rect) : this.add(width, height, data);
            }
        }
        else {
            if (this.updateBinSize(new Rectangle(width + this.padding, height + this.padding, 0, this.height + this.padding)) || this.updateBinSize(new Rectangle(width + this.padding, height + this.padding, this.width + this.padding, 0))) {
                return rect ? this.add(rect) : this.add(width, height, data);
            }
        }
        return undefined;
    }
    findNode(width, height) {
        let score = Number.MAX_VALUE;
        let areaFit;
        let r;
        let bestNode;
        for (let i in this.freeRects) {
            r = this.freeRects[i];
            if (r.width >= width && r.height >= height) {
                areaFit = r.width * r.height - width * height;
                if (areaFit < score) {
                    bestNode = new Rectangle(width, height, r.x, r.y);
                    score = areaFit;
                }
            }
            if (!this.options.allowRotation)
                continue;
            // Continue to test 90-degree rotated rectangle
            if (r.width >= height && r.height >= width) {
                areaFit = r.width * r.height - height * width;
                if (areaFit < score) {
                    bestNode = new Rectangle(width, height, r.x, r.y, true); // Rotated node
                    score = areaFit;
                }
            }
        }
        return bestNode;
    }
    splitNode(freeRect, usedNode) {
        // Test if usedNode intersect with freeRect
        if (!freeRect.collide(usedNode))
            return false;
        // Do vertical split
        if (usedNode.x < freeRect.x + freeRect.width && usedNode.x + usedNode.width > freeRect.x) {
            // New node at the top side of the used node
            if (usedNode.y > freeRect.y && usedNode.y < freeRect.y + freeRect.height) {
                let newNode = new Rectangle(freeRect.width, usedNode.y - freeRect.y, freeRect.x, freeRect.y);
                this.freeRects.push(newNode);
            }
            // New node at the bottom side of the used node
            if (usedNode.y + usedNode.height < freeRect.y + freeRect.height) {
                let newNode = new Rectangle(freeRect.width, freeRect.y + freeRect.height - (usedNode.y + usedNode.height), freeRect.x, usedNode.y + usedNode.height);
                this.freeRects.push(newNode);
            }
        }
        // Do Horizontal split
        if (usedNode.y < freeRect.y + freeRect.height &&
            usedNode.y + usedNode.height > freeRect.y) {
            // New node at the left side of the used node.
            if (usedNode.x > freeRect.x && usedNode.x < freeRect.x + freeRect.width) {
                let newNode = new Rectangle(usedNode.x - freeRect.x, freeRect.height, freeRect.x, freeRect.y);
                this.freeRects.push(newNode);
            }
            // New node at the right side of the used node.
            if (usedNode.x + usedNode.width < freeRect.x + freeRect.width) {
                let newNode = new Rectangle(freeRect.x + freeRect.width - (usedNode.x + usedNode.width), freeRect.height, usedNode.x + usedNode.width, freeRect.y);
                this.freeRects.push(newNode);
            }
        }
        return true;
    }
    pruneFreeList() {
        // Go through each pair of freeRects and remove any rects that is redundant
        let i = 0;
        let j = 0;
        let len = this.freeRects.length;
        while (i < len) {
            j = i + 1;
            let tmpRect1 = this.freeRects[i];
            while (j < len) {
                let tmpRect2 = this.freeRects[j];
                if (tmpRect2.contain(tmpRect1)) {
                    this.freeRects.splice(i, 1);
                    i--;
                    len--;
                    break;
                }
                if (tmpRect1.contain(tmpRect2)) {
                    this.freeRects.splice(j, 1);
                    j--;
                    len--;
                }
                j++;
            }
            i++;
        }
    }
    updateBinSize(node) {
        if (!this.options.smart)
            return false;
        if (this.stage.contain(node))
            return false;
        let tmpWidth = Math.max(this.width, node.x + node.width - this.padding);
        let tmpHeight = Math.max(this.height, node.y + node.height - this.padding);
        if (this.options.pot) {
            tmpWidth = Math.pow(2, Math.ceil(Math.log(tmpWidth) * Math.LOG2E));
            tmpHeight = Math.pow(2, Math.ceil(Math.log(tmpHeight) * Math.LOG2E));
        }
        if (this.options.square) {
            tmpWidth = tmpHeight = Math.max(tmpWidth, tmpHeight);
        }
        if (tmpWidth > this.maxWidth + this.padding || tmpHeight > this.maxHeight + this.padding) {
            return false;
        }
        this.expandFreeRects(tmpWidth + this.padding, tmpHeight + this.padding);
        this.width = this.stage.width = tmpWidth;
        this.height = this.stage.height = tmpHeight;
        return true;
    }
    expandFreeRects(width, height) {
        this.freeRects.forEach((freeRect, index) => {
            if (freeRect.x + freeRect.width >= Math.min(this.width + this.padding, width)) {
                freeRect.width = width - freeRect.x;
            }
            if (freeRect.y + freeRect.height >= Math.min(this.height + this.padding, height)) {
                freeRect.height = height - freeRect.y;
            }
        }, this);
        this.freeRects.push(new Rectangle(width - this.width - this.padding, height, this.width + this.padding, 0));
        this.freeRects.push(new Rectangle(width, height - this.height - this.padding, 0, this.height + this.padding));
        this.freeRects.forEach((freeRect, index) => {
            if (freeRect.width <= 0 || freeRect.height <= 0) {
                this.freeRects.splice(index, 1);
            }
        }, this);
        this.pruneFreeList();
    }
}
//# sourceMappingURL=maxrects-bin.js.map