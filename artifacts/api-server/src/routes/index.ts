import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productosRouter from "./productos";
import ventasRouter from "./ventas";
import resumenRouter from "./resumen";
import configuracionRouter from "./configuracion";
import comprasRouter from "./compras";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productosRouter);
router.use(ventasRouter);
router.use(resumenRouter);
router.use(configuracionRouter);
router.use(comprasRouter);

export default router;
