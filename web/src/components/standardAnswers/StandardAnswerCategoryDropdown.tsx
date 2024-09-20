import { FC } from "react";
import { StandaronyxCategoryResponse } from "./getStandaronyxCategoriesIfEE";
import { Label } from "../admin/connectors/Field";
import MultiSelectDropdown from "../MultiSelectDropdown";
import { StandaronyxCategory } from "@/lib/types";
import { ErrorCallout } from "../ErrorCallout";
import { LoadingAnimation } from "../Loading";
import { Divider } from "@tremor/react";

interface StandaronyxCategoryDropdownFieldProps {
  standaronyxCategoryResponse: StandaronyxCategoryResponse;
  categories: StandaronyxCategory[];
  setCategories: (categories: StandaronyxCategory[]) => void;
}

export const StandaronyxCategoryDropdownField: FC<
  StandaronyxCategoryDropdownFieldProps
> = ({ standaronyxCategoryResponse, categories, setCategories }) => {
  if (!standaronyxCategoryResponse.paidEnterpriseFeaturesEnabled) {
    return null;
  }

  if (standaronyxCategoryResponse.error != null) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch standard answer categories - ${standaronyxCategoryResponse.error.message}`}
      />
    );
  }

  if (standaronyxCategoryResponse.categories == null) {
    return <LoadingAnimation />;
  }

  return (
    <>
      <div>
        <Label>Standard Answer Categories</Label>
        <div className="w-4/12">
          <MultiSelectDropdown
            name="standard_answer_categories"
            label=""
            onChange={(selectedOptions) => {
              const selectedCategories = selectedOptions.map((option) => {
                return {
                  id: Number(option.value),
                  name: option.label,
                };
              });
              setCategories(selectedCategories);
            }}
            creatable={false}
            options={standaronyxCategoryResponse.categories.map((category) => ({
              label: category.name,
              value: category.id.toString(),
            }))}
            initialSelectedOptions={categories.map((category) => ({
              label: category.name,
              value: category.id.toString(),
            }))}
          />
        </div>
      </div>

      <Divider />
    </>
  );
};
