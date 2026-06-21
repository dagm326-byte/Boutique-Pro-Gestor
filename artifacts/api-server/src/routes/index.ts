import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productosRouter from "./productos";
import ventasRouter from "./ventas";
import resumenRouter from "./resumen";
import configuracionRouter from "./configuracion";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productosRouter);
router.use(ventasRouter);
router.use(resumenRouter);
router.use(configuracionRouter);

export default router;
