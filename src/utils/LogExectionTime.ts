export function LogExecutionTime() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (process.env.NODE_ENV === 'development') {
        const label = `${target.constructor.name}.${propertyKey}`;
        console.time(label);
        const result = await originalMethod.apply(this, args);
        console.timeEnd(label);
        return result;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
