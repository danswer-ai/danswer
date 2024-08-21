import * as Yup from "yup";

import { dictionaryType, formType } from "./types";
import {
  Credential,
  getDisplayNameForCredentialKey,
} from "@/lib/connectors/credentials";

export function createValidationSchema(json_values: dictionaryType) {
  const schemaFields: { [key: string]: Yup.StringSchema } = {};

  console.log(json_values);
  for (const key in json_values) {
    if (Object.prototype.hasOwnProperty.call(json_values, key)) {
      if (json_values[key] === null) {
        console.log(`${key} is null`);
        schemaFields[key] = Yup.string().optional();
      } else {
        console.log(`${key} is not null`);
        schemaFields[key] = Yup.string().required(
          `Please enter your ${getDisplayNameForCredentialKey(key)}`
        );
      }
    }
  }
  console.log(schemaFields);

  schemaFields["name"] = Yup.string().optional();
  return Yup.object().shape(schemaFields);
}

export function createEditingValidationSchema(json_values: dictionaryType) {
  const schemaFields: { [key: string]: Yup.StringSchema } = {};

  for (const key in json_values) {
    if (Object.prototype.hasOwnProperty.call(json_values, key)) {
      schemaFields[key] = Yup.string().optional();
    }
  }

  schemaFields["name"] = Yup.string().optional();
  return Yup.object().shape(schemaFields);
}

export function createInitialValues(credential: Credential<any>): formType {
  const initialValues: formType = {
    name: credential.name || "",
  };

  for (const key in credential.credential_json) {
    initialValues[key] = "";
  }

  return initialValues;
}
