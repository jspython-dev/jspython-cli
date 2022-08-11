
export class Assert {
  #chainedCheckCount: number = 1;
  public status: boolean = true;
  public message?: string;
  readonly #logFn: (success: boolean, msg: string) => void;

  constructor(
    public assert: string,
    private dataContext: object,
    logFn: (success: boolean, msg: string) => void
  ) {
    this.#logFn = logFn;
  }

  equal(expected: unknown, received: unknown): Assert {
    return this.assertFunction(
      expected,
      received,
      (e, r) => {
        if (typeof e === 'object') {
          // deepClone
          return JSON.stringify(e) !== JSON.stringify(r);
        }

        return e === r;
      },
      (e, r) => `Expected '${e}', received '${r}'`
    );
  }

  notEqual(expected: unknown, received: unknown): Assert {
    return this.assertFunction(
      expected,
      received,
      (e, r) => {
        if (typeof e === 'object') {
          // deepClone
          return JSON.stringify(e) !== JSON.stringify(r);
        }

        return e !== r;
      },
      (e, r) => `Expected '${e}' is the same as received '${r}'`
    );
  }

  isTrue(value: unknown): Assert {
    return this.assertFunction(
      value,
      null,
      (e, r) => e === true,
      (e, r) => `Value '${e}' is not true`
    );
  }

  isFalse(value: unknown): Assert {
    return this.assertFunction(
      value,
      null,
      (e, r) => e === false,
      (e, r) => `Value '${e}' is not false`
    );
  }

  greaterThan(value1: number | Date, value2: number | Date): Assert {
    return this.assertFunction(
      value1,
      value2,
      (e: any, r: any) => e > r,
      (e, r) => `${e}' is not greater than ${r}`
    );
  }

  greaterOrEqualThan(value1: number | Date, value2: number | Date): Assert {
    return this.assertFunction(
      value1,
      value2,
      (e: any, r: any) => e >= r,
      (e, r) => `${e}' is not greater (or equal) than ${r}`
    );
  }

  inRange(value: number | Date, min: number | Date, max: number | Date): Assert {
    return this.between(value, min, max);
  }

  between(value: number | Date, min: number | Date, max: number | Date): Assert {
    return this.assertFunction(
      value,
      { min, max },
      (v: any, r: any) => v >= r.min && v <= r.max,
      (v, r: any) => `${v}' is NOT in range of ${r.min} and ${r.max}`
    );
  }

  lessThan(value1: number | Date, value2: number | Date): Assert {
    return this.assertFunction(
      value1,
      value2,
      (e: any, r: any) => e < r,
      (e, r) => `${e}' is not lesser than ${r}`
    );
  }

  lessOrEqualThan(value1: number | Date, value2: number | Date): Assert {
    return this.assertFunction(
      value1,
      value2,
      (e: any, r: any) => e <= r,
      (e, r) => `${e}' is not lesser (or equal) than ${r}`
    );
  }

  private assertFunction(
    expected: unknown,
    received: unknown,
    assertExpressionFn: (e: unknown, r: unknown) => boolean,
    errorMessageFn: (e: unknown, r: unknown) => string
  ): Assert {
    // resolve function, if any
    if (typeof expected === 'function') {
      expected = expected(this.dataContext);
    }
    if (typeof received === 'function') {
      received = received(this.dataContext);
    }

    if (!assertExpressionFn(expected, received)) {
      this.status = false;
      this.message = `[${this.#chainedCheckCount}] - ${errorMessageFn(expected, received)}`;
      this.#logFn(false, this.message);
      return this;
    }
    this.#logFn(true, '');
    this.#chainedCheckCount++;
    return this;
  }
}
