import dynamic from "next/dynamic";
import { FunctionComponent, PropsWithChildren } from "react";

const NoSsr: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <>{children}</>
);

export default dynamic(() => Promise.resolve(NoSsr), {
  ssr: false,
});
