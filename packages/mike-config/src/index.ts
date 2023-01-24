import { LibraryInterface } from '@necode-org/mike/library/Library';
import { EventRegistration } from '@necode-org/mike/semantics/Validator';
import { booleanType, floatType, functionOf, intType, optionOf, simpleTypeOf, stringType, unitType } from '@necode-org/mike/types';
import { TypeAttributeKind } from '@necode-org/mike/types/Attribute';

export const userType = simpleTypeOf('User');
export const policyType = simpleTypeOf('Policy');
export const groupType = simpleTypeOf('Group');
export const signalDataType = simpleTypeOf('SignalData');

export const internalUniqueBugType = simpleTypeOf('$Bug');
export const internalUniqueBranchType = simpleTypeOf('$Branch');

export const necodeLib = ({
    types: [
        { name: 'User', numParameters: 0, quantify: () => ({ attributes: [], members: {} }) },
        { name: 'Policy', numParameters: 0, quantify: () => ({ attributes: [{ kind: TypeAttributeKind.IsLegalParameter }], members: {} }) },
        { name: 'Group', numParameters: 0, quantify: () => ({ attributes: [], members: {
            join: functionOf([userType], unitType),
            leave: functionOf([userType], unitType),
            has: functionOf([userType], booleanType),
        } }) },
        { name: 'SignalData', numParameters: 0, quantify: () => ({ attributes: [], members: {
            getInt: functionOf([stringType], optionOf(intType)),
            getFloat: functionOf([stringType], optionOf(floatType)),
            getBoolean: functionOf([stringType], optionOf(booleanType)),
            getString: functionOf([stringType], optionOf(stringType)),
        } }) },

        // Internal types
        { name: '$Bug', numParameters: 0, quantify: () => ({ attributes: [], members: {} }) },
        { name: '$Branch', numParameters: 0, quantify: () => ({ attributes: [], members: {} }) },
    ],
    values: [
        { name: 'link', type: functionOf([userType, userType], unitType) },
        { name: 'unlink', type: functionOf([userType, userType], unitType) },
        { name: 'Group', type: functionOf([policyType], groupType) },
        { name: 'BUG', type: internalUniqueBugType },
        { name: '_$BRANCH', type: internalUniqueBranchType },
    ]
} as const) satisfies LibraryInterface;

/* For mike-lsp */
export const libraries = [necodeLib];

/* For mike-lsp */
export const events: EventRegistration[] = [
    { name: 'join', required: false, argumentTypes: [userType] },
    { name: 'leave', required: false, argumentTypes: [userType] },
    { name: 'signal', required: false, argumentTypes: [userType, stringType, signalDataType] },
];
