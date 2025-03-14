
const should = require('should');
const sinon = require('sinon');
require('should-sinon');
const pwm = require('./stubpwm.js');
const i2c = require('./stubi2c.js');

/* eslint "no-plusplus": "off" */
/* eslint "no-bitwise": "off" */

describe('lib/pwm.js', () => {
  describe('exports', () => {
    it('should have constructor', () => {
      pwm.should.be.type('function');
    });

    it('should require options object to initialize', () => {
      (function () {
        pwm().init();
      }).should.throw();
    });

    it('should require i2c object to initialize', () => {
      (function () {
        pwm({ i2c: undefined }).init();
      }).should.throw();
    });

    it('should check busnum is a number to initialize', () => {
      (function () {
        pwm({ i2c, busnum: 'i2c' }).init();
      }).should.throw();
    });

    it('should initialize', () => {
      (function () {
        pwm({ i2c }).init();
      }).should.not.throw();
    });

    it('should require callbacks for asynch methods', () => {
      (function () {
        pwm({ i2c }).init().softwareReset();
      }).should.throw();

      (function () {
        pwm({ i2c }).init().setPWMFreq(1600);
      }).should.throw();

      (function () {
        pwm({ i2c }).init().getPWMFreq();
      }).should.throw();

      (function () {
        pwm({ i2c }).init().setAllPWM(1, 2);
      }).should.throw();

      (function () {
        pwm({ i2c }).init().setPin(1, 0);
      }).should.throw();
    });
  });

  describe('init()', () => {
    const addr = 0x40;

    it('should recognize the i2c devfile and init the i2c driver', () => {
      i2c.resetAll();
      pwm({ i2c }).init();
      i2c.openSync.should.be.calledOnce();
      i2c.openSync.should.be.calledWith(0, {});
      i2c.resetAll();
      pwm.seti2c(1);
      pwm({ i2c }).init();
      i2c.openSync.should.be.calledOnce();
      i2c.openSync.should.be.calledWith(1, {});
    });

    i2c.resetAll();
    let call = 0;
    it('should set all PWM pins to 0', () => {
      pwm({ i2c, address: addr }).init();
      i2c.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFA, 0x00);
      i2c.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFB, 0x00);
      i2c.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFC, 0x00);
      i2c.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFD, 0x00);
    });

    it('should enable all call adress', () => {
      i2c.writeByteSync.getCall(call++).should.be.calledWith(addr, 0x01, 0x04);
    });

    it('should configure all outputs as totem pole', () => {
      i2c.writeByteSync.getCall(call++).should.be.calledWith(addr, 0x00, 0x01);
    });

    it('should wake up the PWM chip', () => {
      i2c.writeByteSync.getCall(call++).should.be.calledWith(addr, 0x00, 0xBEE && 0x01);
    });
  });

  describe('init(cb)', () => {
    const addr = 0x40;

    it('should recognize the i2c devfile and init the i2c driver', (done) => {
      i2c.resetAll();
      pwm.seti2c(0);
      pwm({ i2c }).init(() => {
        i2c.open.should.be.calledOnce();
        i2c.open.should.be.calledWith(0, {});
        i2c.resetAll();
        pwm.seti2c(1);
        pwm({ i2c }).init(() => {
          i2c.open.should.be.calledOnce();
          i2c.open.should.be.calledWith(1, {});
          done();
        });
      });
    });

    i2c.resetAll();
    let call = 0;
    it('should set all PWM pins to 0', (done) => {
      pwm({ i2c, address: addr }).init(() => {
        i2c.writeByte.getCall(call++).should.be.calledWith(addr, 0xFA, 0x00);
        i2c.writeByte.getCall(call++).should.be.calledWith(addr, 0xFB, 0x00);
        i2c.writeByte.getCall(call++).should.be.calledWith(addr, 0xFC, 0x00);
        i2c.writeByte.getCall(call++).should.be.calledWith(addr, 0xFD, 0x00);
        done();
      });
    });

    it('should enable all call adress', () => {
      i2c.writeByte.getCall(call++).should.be.calledWith(addr, 0x01, 0x04);
    });

    it('should configure all outputs as totem pole', () => {
      i2c.writeByte.getCall(call++).should.be.calledWith(addr, 0x00, 0x01);
    });

    it('should wake up the PWM chip', () => {
      i2c.writeByte.getCall(call++).should.be.calledWith(addr, 0x00, 0xBEE && 0x01);
    });
  });

  describe('softwareReset()', () => {
    it('should send a software reset (SWRST) command to all servolib drivers on the bus', (done) => {
      pwm({ i2c }).init().softwareReset((err) => {
        should.equal(err, null);
        i2c.sendByte.should.be.calledOnce();
        i2c.sendByte.should.be.calledWith(0x00, 0x06);
        done();
      });
    });
  });

  describe('softwareResetSync()', () => {
    it('should send a software reset (SWRST) command to all servolib drivers on the bus', () => {
      pwm({ i2c }).init().softwareResetSync();
      i2c.sendByteSync.should.be.calledOnce();
      i2c.sendByteSync.should.be.calledWith(0x00, 0x06);
    });
  });

  describe('setPWMFreqSync()', () => {
    const addr = 0x40;
    const freq = 100;
    const prescale = Math.ceil((25000000 / 4096 / freq) - 1);

    const instance = pwm({ i2c, address: addr }).init();

    it('should fail on wrong params', () => {
      (function () {
        instance.setPWMFreqSync('freq');
      }).should.throw();
    });

    i2c.resetAll();
    let i = 0;
    it('should set sleep mode', () => {
      instance.setPWMFreqSync(freq);
      i2c.writeByteSync.getCall(i++).should.be.calledWith(addr, 0x00, (0xBEE & 0x7F) | 0x10);
    });

    it('should write new prescale val', () => {
      i2c.writeByteSync.getCall(i++).should.be.calledWith(addr, 0xFE, prescale);
    });

    it('should set reset the chip', () => {
      i2c.writeByteSync.getCall(i++).should.be.calledWith(addr, 0x00, 0xBEE);
    });

    it('should set clear reset flag', () => {
      i2c.writeByteSync.getCall(i++).should.be.calledWith(addr, 0x00, 0xBEE | 0x80);
    });
  });

  describe('setPWMFreq()', () => {
    const addr = 0x40;
    const freq = 100;
    const prescale = Math.ceil((25000000 / 4096 / freq) - 1);

    const instance = pwm({ i2c, address: addr }).init();

    it('should fail on wrong params', () => {
      (function () {
        instance.setPWMFreq('freq');
      }).should.throw();
    });

    i2c.resetAll();
    let i = 0;
    it('should set sleep mode', (done) => {
      instance.setPWMFreq(freq, (err) => {
        should.equal(err, null);

        i2c.writeByte.getCall(i++).should.be.calledWith(addr, 0x00, (0xBEE & 0x7F) | 0x10);

        it('should write new prescale val', () => {
          i2c.writeByte.getCall(i++).should.be.calledWith(addr, 0xFE, prescale);
        });

        it('should set reset the chip', () => {
          i2c.writeByte.getCall(i++).should.be.calledWith(addr, 0x00, 0xBEE);
        });

        it('should set clear reset flag', () => {
          i2c.writeByte.getCall(i++).should.be.calledWith(addr, 0x00, 0xBEE | 0x80);
        });

        done();
      });
    });
  });

  describe('getPWMFreq()', () => {
    const addr = 0x40;

    const instance = pwm({ i2c, address: addr }).init();
    i2c.resetAll();

    it('should read prescale val', (done) => {
      instance.getPWMFreq((err) => {
        should.equal(err, null);
        i2c.readByte.should.be.calledWith(addr, 0xFE);
        done();
      });
    });
  });

  describe('getPWMFreqSync()', () => {
    const addr = 0x40;

    const instance = pwm({ i2c, address: addr }).init();
    i2c.resetAll();

    it('should read prescale val', () => {
      instance.getPWMFreqSync();
      i2c.readByteSync.should.be.calledWith(addr, 0xFE);
    });
  });

  describe('setPWM()', () => {
    const addr = 0x40;
    const channel = 5;
    const on = 0x10;
    const off = 0xFE;

    const instance = pwm({ i2c, address: addr }).init();

    it('should fail on channels different to 0 to 15', () => {
      (function () {
        instance.setPWM(16, on, off);
      }).should.throw();
      (function () {
        instance.setPin(-1, on, off);
      }).should.throw();
    });

    it('should fail on wrong params', () => {
      (function () {
        instance.setPWM(0, 4097, 0, () => {});
      }).should.throw();
      (function () {
        instance.setPWM(0, 0, -1, () => {});
      }).should.throw();
    });

    it('should set all 4 registers for the channel', (done) => {
      i2c.resetAll();
      instance.setPWM(channel, on, off, (err) => {
        should.equal(err, null);
        i2c.writeByte.getCall(0).should.be.calledWith(addr, 0x06 + (4 * channel), on & 0xFF);
        i2c.writeByte.getCall(1).should.be.calledWith(addr, 0x07 + (4 * channel), on >> 8);
        i2c.writeByte.getCall(2).should.be.calledWith(addr, 0x08 + (4 * channel), off & 0xFF);
        i2c.writeByte.getCall(3).should.be.calledWith(addr, 0x09 + (4 * channel), off >> 8);
        done();
      });
    });
  });

  describe('setPWMSync()', () => {
    const addr = 0x40;
    const channel = 5;
    const on = 0x10;
    const off = 0xFE;

    const instance = pwm({ i2c, address: addr }).init();

    it('should fail on channels different to 0 to 15', () => {
      (function () {
        instance.setPWMSync(16, on, off);
      }).should.throw();
      (function () {
        instance.setPin(-1, on, off);
      }).should.throw();
    });

    it('should fail on wrong params', () => {
      (function () {
        instance.setPWMSync(0, 4097, 0);
      }).should.throw();
      (function () {
        instance.setPWMSync(0, 0, -1);
      }).should.throw();
    });

    it('should set all 4 registers for the channel', () => {
      i2c.resetAll();
      instance.setPWMSync(channel, on, off);
      i2c.writeByteSync.getCall(0).should.be.calledWith(addr, 0x06 + (4 * channel), on & 0xFF);
      i2c.writeByteSync.getCall(1).should.be.calledWith(addr, 0x07 + (4 * channel), on >> 8);
      i2c.writeByteSync.getCall(2).should.be.calledWith(addr, 0x08 + (4 * channel), off & 0xFF);
      i2c.writeByteSync.getCall(3).should.be.calledWith(addr, 0x09 + (4 * channel), off >> 8);
    });
  });

  describe('setAllPWM()', () => {
    const addr = 0x40;
    const on = 0x10;
    const off = 0xFE;

    const instance = pwm({ i2c, address: addr }).init();

    it('should fail on wrong params', () => {
      (function () {
        instance.setAllPWM(4097, 0, () => {});
      }).should.throw();
    });

    it('should set all 4 registers for the channel', (done) => {
      i2c.resetAll();
      instance.setAllPWM(on, off, (err) => {
        should.equal(err, null);
        i2c.writeByte.getCall(0).should.be.calledWith(addr, 0xFA, on & 0xFF);
        i2c.writeByte.getCall(1).should.be.calledWith(addr, 0xFB, on >> 8);
        i2c.writeByte.getCall(2).should.be.calledWith(addr, 0xFC, off & 0xFF);
        i2c.writeByte.getCall(3).should.be.calledWith(addr, 0xFD, off >> 8);
        done();
      });
    });
  });

  describe('setAllPWMSync()', () => {
    const addr = 0x40;
    const on = 0x10;
    const off = 0xFE;

    const instance = pwm({ i2c, address: addr }).init();

    it('should fail on wrong params', () => {
      (function () {
        instance.setAllPWMSync(4097, 0);
      }).should.throw();
    });

    it('should set all 4 registers for the channel', () => {
      i2c.resetAll();
      instance.setAllPWMSync(on, off);
      i2c.writeByteSync.getCall(0).should.be.calledWith(addr, 0xFA, on & 0xFF);
      i2c.writeByteSync.getCall(1).should.be.calledWith(addr, 0xFB, on >> 8);
      i2c.writeByteSync.getCall(2).should.be.calledWith(addr, 0xFC, off & 0xFF);
      i2c.writeByteSync.getCall(3).should.be.calledWith(addr, 0xFD, off >> 8);
    });
  });

  describe('setPin()', () => {
    const addr = 0x40;
    const channel = 5;

    const instance = pwm({ i2c, address: addr }).init();
    i2c.resetAll();

    it('should fail on values different to 1 or 0', () => {
      (function () {
        instance.setPin(channel, 2, () => {});
      }).should.throw();

      (function () {
        instance.setPin(channel, -1, () => {});
      }).should.throw();
    });

    it('should fail on channels different to 0 to 15', () => {
      (function () {
        instance.setPin(16, 0, () => {});
      }).should.throw();

      (function () {
        instance.setPin(-1, 1, () => {});
      }).should.throw();
    });

    it('should set all 4 registers for the channel to OFF', (done) => {
      const offset = 4 * channel;
      instance.setPin(channel, 0, (err) => {
        should.equal(err, null);
        i2c.writeByte.getCall(0).should.be.calledWith(addr, 0x06 + offset, 0);
        i2c.writeByte.getCall(1).should.be.calledWith(addr, 0x07 + offset, 0);
        i2c.writeByte.getCall(2).should.be.calledWith(addr, 0x08 + offset, 4096 & 0xFF);
        i2c.writeByte.getCall(3).should.be.calledWith(addr, 0x09 + offset, 4096 >> 8);
        i2c.resetAll();
        done();
      });
    });

    it('should set all 4 registers for the channel to ON', (done) => {
      const offset = 4 * channel;
      instance.setPin(channel, 1, (err) => {
        should.equal(err, null);
        i2c.writeByte.getCall(0).should.be.calledWith(addr, 0x06 + offset, 4096 & 0xFF);
        i2c.writeByte.getCall(1).should.be.calledWith(addr, 0x07 + offset, 4096 >> 8);
        i2c.writeByte.getCall(2).should.be.calledWith(addr, 0x08 + offset, 0);
        i2c.writeByte.getCall(3).should.be.calledWith(addr, 0x09 + offset, 0);
        done();
      });
    });
  });

  describe('setPinSync()', () => {
    const addr = 0x40;
    const channel = 5;

    const instance = pwm({ i2c, address: addr }).init();
    i2c.resetAll();

    it('should fail on values different to 1 or 0', () => {
      (function () {
        instance.setPinSync(channel, 2);
      }).should.throw();

      (function () {
        instance.setPinSync(channel, -1);
      }).should.throw();
    });

    it('should fail on channels different to 0 to 15', () => {
      (function () {
        instance.setPinSync(16, 0);
      }).should.throw();

      (function () {
        instance.setPinSync(-1, 1);
      }).should.throw();
    });

    it('should set all 4 registers for the channel to OFF', () => {
      instance.setPinSync(channel, 0);
      const offset = 4 * channel;
      i2c.writeByteSync.getCall(0).should.be.calledWith(addr, 0x06 + offset, 0);
      i2c.writeByteSync.getCall(1).should.be.calledWith(addr, 0x07 + offset, 0);
      i2c.writeByteSync.getCall(2).should.be.calledWith(addr, 0x08 + offset, 4096 & 0xFF);
      i2c.writeByteSync.getCall(3).should.be.calledWith(addr, 0x09 + offset, 4096 >> 8);
      i2c.resetAll();
    });

    it('should set all 4 registers for the channel to ON', () => {
      instance.setPinSync(channel, 1);
      const offset = 4 * channel;
      i2c.writeByteSync.getCall(0).should.be.calledWith(addr, 0x06 + offset, 4096 & 0xFF);
      i2c.writeByteSync.getCall(1).should.be.calledWith(addr, 0x07 + offset, 4096 >> 8);
      i2c.writeByteSync.getCall(2).should.be.calledWith(addr, 0x08 + offset, 0);
      i2c.writeByteSync.getCall(3).should.be.calledWith(addr, 0x09 + offset, 0);
    });
  });

  describe('Async chained bus read/writes fail', () => {
    it('should fail on setPWMFreq if i2c read fails (async)', (done) => {
      const addr = 0x40;
      const freq = 100;

      i2c.resetAll();
      const readByteBkp = i2c.readByte;
      i2c.readByte = sinon.stub().yieldsAsync('error reading', null);
      const instance = pwm({ i2c, address: addr }).init();

      instance.setPWMFreq(freq, (err) => {
        should.notEqual(err, null);
        i2c.readByte = readByteBkp;
        done();
      });
    });

    it('should fail on setPWMFreq if i2c write fails (async)', (done) => {
      const addr = 0x40;
      const freq = 100;

      i2c.resetAll();
      const writeByteBkp = i2c.writeByte;
      i2c.writeByte = sinon.stub().yieldsAsync('error writing', null);
      const instance = pwm({ i2c, address: addr }).init();

      instance.setPWMFreq(freq, (err) => {
        should.notEqual(err, null);
        i2c.writeByte = writeByteBkp;
        done();
      });
    });

    it('should fail on getPWMFreq if i2c read fails (async)', (done) => {
      const addr = 0x40;

      i2c.resetAll();
      const readByteBkp = i2c.readByte;
      i2c.readByte = sinon.stub().yieldsAsync('error reading', null);
      const instance = pwm({ i2c, address: addr }).init();

      instance.getPWMFreq((err) => {
        should.notEqual(err, null);
        i2c.readByte = readByteBkp;
        done();
      });
    });

    it('should fail on init if i2c read fails (async)', (done) => {
      const addr = 0x40;

      i2c.resetAll();
      const readByteBkp = i2c.readByte;
      i2c.readByte = sinon.stub().yieldsAsync('error reading', null);
      const instance = pwm({ i2c, address: addr });

      instance.init((err) => {
        should.notEqual(err, null);
        i2c.readByte = readByteBkp;
        done();
      });
    });

    it('should fail on init if i2c write fails (async)', (done) => {
      const addr = 0x40;

      i2c.resetAll();
      const writeByteBkp = i2c.writeByte;
      i2c.writeByte = sinon.stub().yieldsAsync('error writing', null);
      const instance = pwm({ i2c, address: addr });

      instance.init((err) => {
        should.notEqual(err, null);
        i2c.writeByte = writeByteBkp;
        done();
      });
    });
  });
});
