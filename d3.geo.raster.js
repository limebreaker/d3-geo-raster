// Generated by CoffeeScript 1.9.2
var bilinear, key, mercatorPhi, pixel, prefix, prefixMatch, quadTiles, quadkey, urlTemplate;

quadTiles = require('d3.quadTiles');

prefixMatch = function(p) {
  var j, len, prefix;
  for (j = 0, len = p.length; j < len; j++) {
    prefix = p[j];
    if ((prefix + "Transform") in document.body.style) {
      return "-" + prefix + "-";
    }
  }
  return '';
};

prefix = prefixMatch(['webkit', 'ms', 'Moz', 'O']);

key = function(d) {
  return d.key.join(', ');
};

pixel = function(d) {
  return (d | 0) + 'px';
};

mercatorPhi = function(y) {
  return Math.atan(Math.exp(-y * Math.PI / 180)) * 360 / Math.PI - 90;
};

mercatorPhi.invert = function(Phi) {
  return -Math.log(Math.tan(Math.PI * .25 + Phi * Math.PI / 360)) * 180 / Math.PI;
};

bilinear = function(f) {
  return function(x, y, o) {
    var x0, x1, y0, y1;
    x0 = Math.floor(x);
    y0 = Math.floor(y);
    x1 = Math.ceil(x);
    y1 = Math.ceil(y);
    if (x0 === x1 || y0 === y1) {
      return f(x0, y0, o);
    }
    return (f(x0, y0, o) * (x1 - x) * (y1 - y) + f(x1, y0, o) * (x - x0) * (y1 - y) + f(x0, y1, o) * (x1 - x) * (y - y0) + f(x1, y1, o) * (x - x0) * (y - y0)) / ((x1 - x0) * (y1 - y0));
  };
};

urlTemplate = function(s) {
  return function(o) {
    return s.replace(/\{([^\}]+)\}/g, function(_, d) {
      var v;
      v = o[d];
      if (v !== null) {
        return v;
      } else {
        return d === 'quadkey' && quadkey(o.x, o.y, o.z);
      }
    });
  };
};

quadkey = function(column, row, zoom) {
  var key;
  key = [];
  while (i <= zoom) {
    key.push((row >> zoom - i & 1) << 1 | column >> zoom - i & 1);
    i++;
  }
  return key.join('');
};

module.exports = d3.geo.raster = function(projection) {
  var imgCanvas, imgContext, onload, path, redraw, reprojectDispatch, scaleExtent, subdomains, tms, url;
  path = d3.geo.path().projection(projection);
  url = null;
  scaleExtent = [0, Infinity];
  subdomains = ['a', 'b', 'c', 'd'];
  tms = false;
  reprojectDispatch = d3.dispatch('reprojectcomplete');
  imgCanvas = document.createElement('canvas');
  imgContext = imgCanvas.getContext('2d');
  redraw = function(layer) {
    var ds, pot, t, tile, z;
    z = Math.max(scaleExtent[0], Math.min(scaleExtent[1], (Math.log(projection.scale()) / Math.LN2 | 0) - 6));
    pot = z + 6;
    ds = projection.scale() / Math.pow(2, pot);
    t = projection.translate();
    layer.style(prefix + 'transform', 'translate(' + t.map(pixel) + ')scale(' + ds + ')');
    tile = layer.selectAll('.tile').data(quadTiles(projection, z), key);
    tile.enter().append('canvas').attr('class', 'tile').each(function(d) {
      var canvas, image, k, y;
      canvas = this;
      image = d.image = new Image;
      k = d.key;
      image.crossOrigin = true;
      image.onload = function() {
        return setTimeout((function() {
          return onload(d, canvas, pot);
        }), 1);
      };
      y = k[1];
      if (tms) {
        y = Math.pow(2, z) - y - 1;
      }
      return image.src = url({
        x: k[0],
        y: y,
        z: k[2],
        subdomain: subdomains[(k[0] * 31 + k[1]) % subdomains.length]
      });
    }).transition().delay(500).each('end', function() {
      return reprojectDispatch.reprojectcomplete();
    });
    return tile.exit().remove();
  };
  onload = function(d, canvas, pot) {
    var Lambda, Lambda0, Lambda1, Phi, Phi0, Phi1, bounds, c, context, dx, dy, height, i, image, interpolate, k, mPhi0, mPhi1, p, q, s, sourceData, sx, sy, t, target, targetData, width, x, x0, x1, y, y0, y1;
    t = projection.translate();
    s = projection.scale();
    c = projection.clipExtent();
    image = d.image;
    dx = image.width;
    dy = image.height;
    k = d.key;
    width = Math.pow(2, k[2]);
    projection.translate([0, 0]).scale(1 << pot).clipExtent(null);
    imgCanvas.width = dx;
    imgCanvas.height = dy;
    imgContext.drawImage(image, 0, 0, dx, dy);
    bounds = path.bounds(d);
    x0 = d.x0 = bounds[0][0] | 0;
    y0 = d.y0 = bounds[0][1] | 0;
    x1 = bounds[1][0] + 1 | 0;
    y1 = bounds[1][1] + 1 | 0;
    Lambda0 = k[0] / width * 360 - 180;
    Lambda1 = (k[0] + 1) / width * 360 - 180;
    Phi0 = k[1] / width * 360 - 180;
    Phi1 = (k[1] + 1) / width * 360 - 180;
    mPhi0 = mercatorPhi(Phi0);
    mPhi1 = mercatorPhi(Phi1);
    width = canvas.width = x1 - x0;
    height = canvas.height = y1 - y0;
    context = canvas.getContext('2d');
    if (width > 0 && height > 0) {
      sourceData = imgContext.getImageData(0, 0, dx, dy).data;
      target = context.createImageData(width, height);
      targetData = target.data;
      interpolate = bilinear(function(x, y, offset) {
        return sourceData[(y * dx + x) * 4 + offset];
      });
      y = y0;
      i = -1;
      while (y < y1) {
        x = x0;
        while (x < x1) {
          p = projection.invert([x, y]);
          Lambda = void 0;
          Phi = void 0;
          if (!p || isNaN(Lambda = p[0]) || isNaN(Phi = p[1]) || Lambda > Lambda1 || Lambda < Lambda0 || Phi > mPhi0 || Phi < mPhi1) {
            i += 4;
            ++x;
            continue;
          }
          Phi = mercatorPhi.invert(Phi);
          sx = (Lambda - Lambda0) / (Lambda1 - Lambda0) * dx;
          sy = (Phi - Phi0) / (Phi1 - Phi0) * dy;
          if (1) {
            q = (((Lambda - Lambda0) / (Lambda1 - Lambda0) * dx | 0) + ((Phi - Phi0) / (Phi1 - Phi0) * dy | 0) * dx) * 4;
            targetData[++i] = sourceData[q];
            targetData[++i] = sourceData[++q];
            targetData[++i] = sourceData[++q];
          } else {
            targetData[++i] = interpolate(sx, sy, 0);
            targetData[++i] = interpolate(sx, sy, 1);
            targetData[++i] = interpolate(sx, sy, 2);
          }
          targetData[++i] = 0xff;
          ++x;
        }
        ++y;
      }
      context.putImageData(target, 0, 0);
    }
    d3.selectAll([canvas]).style('left', x0 + 'px').style('top', y0 + 'px');
    return projection.translate(t).scale(s).clipExtent(c);
  };
  redraw.url = function(_) {
    if (!arguments.length) {
      return url;
    }
    url = typeof _ === 'string' ? urlTemplate(_) : _;
    return redraw;
  };
  redraw.scaleExtent = function(_) {
    if (!arguments.length) {
      return scaleExtent;
    }
    scaleExtent = _;
    return redraw;
  };
  redraw.tms = function(_) {
    if (!arguments.length) {
      return tms;
    }
    tms = _;
    return redraw;
  };
  redraw.subdomains = function(_) {
    if (!arguments.length) {
      return subdomains;
    }
    subdomains = _;
    return redraw;
  };
  d3.rebind(redraw, reprojectDispatch, 'on');
  return redraw;
};

module.exports.prefix = prefix;