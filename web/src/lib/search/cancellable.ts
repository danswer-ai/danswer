export class CancellationToken {
  private shouldCancel = false;

  cancel() {
    this.shouldCancel = true;
  }

  get isCancellationRequested() {
    return this.shouldCancel;
  }
}

interface CancellableArgs {
  cancellationToken: CancellationToken;
  fn: (...args: any[]) => any;
}

export const cancellable = ({ cancellationToken, fn }: CancellableArgs) => {
  return (...args: any[]): any => {
    if (cancellationToken.isCancellationRequested) {
      return;
    }
    return fn(...args);
  };
};

interface AsyncCancellableArgs {
  cancellationToken: CancellationToken;
  fn: (...args: any[]) => Promise<any>;
}

export const asyncCancellable = ({
  cancellationToken,
  fn,
}: AsyncCancellableArgs) => {
  return async (...args: any[]): Promise<any> => {
    if (cancellationToken.isCancellationRequested) {
      return;
    }
    return await fn(...args);
  };
};
