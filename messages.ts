export default class Messages {
  static conditionCannotBeEmpty =
    "Condition for modification operation cannot be empty";

  static functionWithWrongRowCount(
    functionName: string,
    numberInsertedRows: number,
  ): string {
    return `${functionName}() must have inserted one row, but actually inserted ${numberInsertedRows} rows`;
  }

  /**
   * @param methodName
   * @param valueIndex
   * @param operator - in, notIn, etc
   * @returns
   * @example:
   * sqlFormat: values[${index}].build() must return a string
   * sqlFormatObject: values["${name}"].build() must return a string
   * sqlConditionStrings: values["${name}"].$in.build() must return a string
   * sqlConditionStrings: values["${name}"].$notIn.build() must return a string
   */
  static methodMustReturnString(
    methodName: string,
    valueIndex: string,
    operator?: string,
  ) {
    return operator
      ? `${methodName}: values[${valueIndex}].${operator}.build() must return a string`
      : `${methodName}: values[${valueIndex}].build() must return a string`;
  }

  static undefinedValueConditionalKeys(keys: string[]): string {
    return `Found undefined value for condition keys ${keys}; it may cause unexpected errors`;
  }
}
